import { NextRequest, NextResponse } from "next/server";
import { db, pushSubscriptions } from "@/lib/db";
import { eq, lte, and, isNotNull } from "drizzle-orm";
import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:abon@xdak.ukr.education";
const CRON_SECRET = process.env.CRON_SECRET;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * POST /api/push/remind
 * Called by Vercel Cron (or any scheduler) to send due reminders.
 * Protected by CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  // Auth check — Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  // Also support x-cron-secret for manual calls
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const providedSecret = bearerToken ?? cronHeader;

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 503 }
    );
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

  // Find unsent subscriptions due within next 24h
  // BUG FIX: isNotNull guard — subscriptions without remindAt should never be sent
  const due = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        isNotNull(pushSubscriptions.remindAt),
        lte(pushSubscriptions.remindAt, windowEnd),
        eq(pushSubscriptions.sent, false)
      )
    );

  let sent = 0;
  let failed = 0;

  for (const sub of due) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: "ХДАК Бібліотека — Нагадування",
          body: "Завтра термін повернення книги. Не забудьте здати вчасно!",
        })
      );
      await db
        .update(pushSubscriptions)
        .set({ sent: true })
        .where(eq(pushSubscriptions.id, sub.id));
      sent++;
    } catch (err: unknown) {
      // 410 Gone — subscription expired, remove it
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        (err as { statusCode: number }).statusCode === 410
      ) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      } else {
        console.error("Push send failed for", sub.endpoint, err);
        failed++;
      }
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: due.length });
}
