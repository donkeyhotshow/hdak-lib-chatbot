import type { ZodType } from "zod";
import { SECURITY_CONFIG } from "../../config/security";
import { logSecurityEvent } from "../observability/securityLogger";

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
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

export async function executeSandboxedTool<TInput, TResult>(
  options: ExecuteSandboxedToolOptions<TInput, TResult>
): Promise<TResult> {
  const allowedTools = SECURITY_CONFIG.toolSandbox
    .allowedTools as readonly string[];
  if (!allowedTools.includes(options.toolName)) {
    logSecurityEvent({
      endpoint: options.context.endpoint,
      eventType: "tool_rejected",
      userId: options.context.userId ?? null,
      ip: options.context.ip ?? null,
      details: { toolName: options.toolName, reason: "not_in_allowlist" },
    });
    throw new Error(`Tool "${options.toolName}" is not allowed`);
  }

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
    logSecurityEvent({
      endpoint: options.context.endpoint,
      eventType: "tool_execution",
      userId: options.context.userId ?? null,
      ip: options.context.ip ?? null,
      details: { toolName: options.toolName, latencyMs: Date.now() - startMs },
    });
    return result;
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      error.message.toLowerCase().includes("timed out");
    if (isTimeout) {
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
