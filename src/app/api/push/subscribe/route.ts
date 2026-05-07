import { NextRequest, NextResponse } from "next/server";
import { db, pushSubscriptions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  getSessionIdFromRequest,
  PushSubscriptionSchema,
  PushUnsubscribeSchema,
  validateInput,
} from "@/lib/validation";
import { isForbiddenOrigin } from "@/lib/cors";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Невірний формат" }, { status: 400 });
  }

  const parsed = await validateInput(PushSubscriptionSchema, body);
  if (!parsed.success || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error || "Невалідні вхідні дані" },
      { status: 400 }
    );
  }

  const { endpoint, keys, remindAt } = parsed.data;

  const remindAtDate = remindAt ? new Date(remindAt) : null;
  if (remindAt && isNaN(remindAtDate!.getTime())) {
    return NextResponse.json(
      { error: "Невалідна дата remindAt" },
      { status: 400 }
    );
  }

  const sessionId = getSessionIdFromRequest(request);

  try {
    // Upsert — update remindAt if subscription already exists
    await db
      .insert(pushSubscriptions)
      .values({
        sessionId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        // BUG FIX: use null explicitly (not undefined) — Drizzle treats undefined as "omit column"
        remindAt: remindAtDate,
        sent: false,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          remindAt: remindAtDate,
          sent: false,
          sessionId,
        },
      });

    return NextResponse.json({ success: true, message: "Підписку збережено" });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json(
      { error: "Помилка збереження підписки" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  // Rate-limit DELETE same as POST to prevent enumeration attacks
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Невірний формат" }, { status: 400 });
  }

  const parsed = await validateInput(PushUnsubscribeSchema, body);
  if (!parsed.success || !parsed.data?.endpoint) {
    return NextResponse.json({ error: "Відсутній endpoint" }, { status: 400 });
  }

  // Session ownership check — only the session that created the subscription can delete it
  const sessionId = getSessionIdFromRequest(request);

  try {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, parsed.data.endpoint),
          eq(pushSubscriptions.sessionId, sessionId)
        )
      );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return NextResponse.json(
      { error: "Помилка видалення підписки" },
      { status: 500 }
    );
  }
}
