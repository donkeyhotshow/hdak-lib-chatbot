import type { ZodType } from "zod";
import { SECURITY_CONFIG } from "../config/security";
import { logSecurityEvent } from "../observability/securityLogger";
import { getTool } from "../tools/registry";

type SandboxContext = {
  endpoint: string;
  userId?: number | null;
  ip?: string | null;
};

type ExecuteSandboxedToolOptions<TInput, TResult> = {
  toolName: string;
  input: unknown;
  schema: ZodType<TInput>;
  context: SandboxContext;
  execute: (input: TInput) => Promise<TResult>;
};

type ExecuteRegisteredToolOptions = {
  toolName: string;
  input: unknown;
  context: SandboxContext;
};

class ToolTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Tool execution timed out after ${timeoutMs}ms`);
    this.name = "ToolTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new ToolTimeoutError(timeoutMs)),
      timeoutMs
    );
    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getSerializedResultSize(value: unknown): number {
  const serialized = JSON.stringify(value);
  return Buffer.byteLength(serialized ?? "null");
}

function assertToolAllowed(toolName: string, context: SandboxContext) {
  const allowedTools = SECURITY_CONFIG.toolSandbox.allowedTools;
  if (!allowedTools.some(tool => tool === toolName)) {
    logSecurityEvent({
      endpoint: context.endpoint,
      eventType: "tool_rejected",
      userId: context.userId ?? null,
      ip: context.ip ?? null,
      details: { toolName, reason: "not_in_allowlist" },
    });
    throw new Error(`Tool "${toolName}" is not allowed`);
  }
}

export async function executeRegisteredSandboxedTool<TResult>(
  options: ExecuteRegisteredToolOptions
): Promise<TResult> {
  assertToolAllowed(options.toolName, options.context);

  const registeredTool = getTool(options.toolName);
  if (!registeredTool) {
    throw new Error(`Unknown tool: ${options.toolName}`);
  }

  return executeSandboxedTool({
    toolName: options.toolName,
    input: options.input,
    schema: registeredTool.schema,
    context: options.context,
    execute: parsedInput =>
      registeredTool.execute(parsedInput, options.context),
  }) as Promise<TResult>;
}

export async function executeSandboxedTool<TInput, TResult>(
  options: ExecuteSandboxedToolOptions<TInput, TResult>
): Promise<TResult> {
  assertToolAllowed(options.toolName, options.context);

  const parsed = options.schema.safeParse(options.input);
  if (!parsed.success) {
    logSecurityEvent({
      endpoint: options.context.endpoint,
      eventType: "tool_rejected",
      userId: options.context.userId ?? null,
      ip: options.context.ip ?? null,
      details: { toolName: options.toolName, reason: "invalid_parameters" },
    });
    throw new Error(`Invalid parameters for tool "${options.toolName}"`);
  }

  const startMs = Date.now();
  try {
    const result = await withTimeout(
      options.execute(parsed.data),
      SECURITY_CONFIG.toolSandbox.executionTimeoutMs
    );
    const resultSize = getSerializedResultSize(result);
    if (resultSize > SECURITY_CONFIG.toolSandbox.maxOutputChars) {
      logSecurityEvent({
        endpoint: options.context.endpoint,
        eventType: "tool_rejected",
        userId: options.context.userId ?? null,
        ip: options.context.ip ?? null,
        details: {
          toolName: options.toolName,
          reason: "output_too_large",
          outputSize: resultSize,
        },
      });
      throw new Error(`Tool "${options.toolName}" output exceeds safety limit`);
    }
    logSecurityEvent({
      endpoint: options.context.endpoint,
      eventType: "tool_execution",
      userId: options.context.userId ?? null,
      ip: options.context.ip ?? null,
      details: { toolName: options.toolName, latencyMs: Date.now() - startMs },
    });
    return result;
  } catch (error) {
    if (error instanceof ToolTimeoutError) {
      logSecurityEvent({
        endpoint: options.context.endpoint,
        eventType: "tool_timeout",
        userId: options.context.userId ?? null,
        ip: options.context.ip ?? null,
        details: { toolName: options.toolName },
      });
    }
    throw error;
  }
}
