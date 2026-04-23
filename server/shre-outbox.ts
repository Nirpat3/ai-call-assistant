import { db } from "./db";
import { shreOutbox } from "../shared/schema";
import { and, eq, isNull, lt, sql } from "drizzle-orm";

const SHRE_API_URL = process.env.SHRE_API_URL || "http://127.0.0.1:5438";
const SHRE_API_TOKEN = process.env.SHRE_API_TOKEN || "";
const DRAIN_INTERVAL_MS = Number(process.env.SHRE_OUTBOX_DRAIN_MS || 30_000);
const MAX_ATTEMPTS = 20; // ~exp-backoff ceiling; event stays queryable after
const BATCH_SIZE = 25;
const SYNC_TIMEOUT_MS = 5_000;

export type OutboxEventType =
  | "call.completed"
  | "call.classified"
  | "voicemail.recorded"
  | "call.blocked_spam";

export async function enqueueShreEvent(
  eventType: OutboxEventType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(shreOutbox).values({ eventType, payload });
  } catch (err) {
    // Outbox write failure is non-fatal — log and continue so a DB hiccup
    // never blocks the call-handling path.
    console.error("[shre-outbox] enqueue failed:", (err as Error).message);
  }
}

/** Returns true if the event was successfully shipped; false if it should remain queued. */
async function shipOne(row: typeof shreOutbox.$inferSelect): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(`${SHRE_API_URL}/v1/ingest/call-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SHRE_API_TOKEN ? { Authorization: `Bearer ${SHRE_API_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        eventType: row.eventType,
        eventId: row.id,
        createdAt: row.createdAt,
        payload: row.payload,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`shre-api ${res.status}: ${body.slice(0, 200)}`);
    }
    return true;
  } catch (err) {
    await db
      .update(shreOutbox)
      .set({
        attempts: sql`${shreOutbox.attempts} + 1`,
        lastError: (err as Error).message.slice(0, 500),
      })
      .where(eq(shreOutbox.id, row.id));
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pulls a batch of unsynced events and ships them. Exp-backoff via attempts:
 * event age (minutes) >= 2^attempts — only ship when enough time has elapsed.
 */
async function drainBatch(): Promise<{ shipped: number; failed: number }> {
  const rows = await db
    .select()
    .from(shreOutbox)
    .where(
      and(
        isNull(shreOutbox.syncedAt),
        lt(shreOutbox.attempts, MAX_ATTEMPTS),
        // exp-backoff: only retry if created_at is older than 2^attempts minutes
        sql`${shreOutbox.createdAt} <= NOW() - (INTERVAL '1 minute' * POWER(2, ${shreOutbox.attempts}))`
      )
    )
    .orderBy(shreOutbox.createdAt)
    .limit(BATCH_SIZE);

  let shipped = 0;
  let failed = 0;
  for (const row of rows) {
    const ok = await shipOne(row);
    if (ok) {
      await db
        .update(shreOutbox)
        .set({ syncedAt: new Date(), lastError: null })
        .where(eq(shreOutbox.id, row.id));
      shipped++;
    } else {
      failed++;
    }
  }
  return { shipped, failed };
}

let drainTimer: NodeJS.Timeout | null = null;

export function startOutboxDrain(): void {
  if (drainTimer) return;
  console.log(`[shre-outbox] drain worker started (interval: ${DRAIN_INTERVAL_MS}ms, target: ${SHRE_API_URL})`);
  const tick = async () => {
    try {
      const { shipped, failed } = await drainBatch();
      if (shipped || failed) {
        console.log(`[shre-outbox] drained: ${shipped} shipped, ${failed} deferred`);
      }
    } catch (err) {
      console.error("[shre-outbox] drain tick failed:", (err as Error).message);
    }
  };
  drainTimer = setInterval(tick, DRAIN_INTERVAL_MS);
  // Kick one off immediately so startup doesn't wait for the first interval.
  void tick();
}

export function stopOutboxDrain(): void {
  if (drainTimer) {
    clearInterval(drainTimer);
    drainTimer = null;
  }
}
