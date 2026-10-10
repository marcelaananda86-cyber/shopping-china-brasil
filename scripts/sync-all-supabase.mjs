import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const syncSecret = process.env.SUPABASE_SYNC_SECRET;
const concurrency = Math.min(5, Math.max(1, Number(process.env.SYNC_CONCURRENCY ?? 3)));

if (!supabaseUrl || !serviceRoleKey || !syncSecret) {
  throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_SYNC_SECRET.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const endpoint = `${supabaseUrl}/functions/v1/sync-catalog?limit=100`;
let cycle = 0;
let totalSelected = 0;
let totalSucceeded = 0;
let totalFailed = 0;

while (true) {
  const before = await counts();
  if (before.pending === 0) {
    console.log(JSON.stringify({ status: "complete", ...before, totalSelected, totalSucceeded, totalFailed }));
    break;
  }

  cycle += 1;
  const batches = await Promise.all(Array.from({ length: concurrency }, invokeBatch));
  for (const batch of batches) {
    totalSelected += batch.selected;
    totalSucceeded += batch.succeeded;
    totalFailed += batch.failed;
  }

  const after = await counts();
  console.log(JSON.stringify({
    status: "running",
    cycle,
    processedThisCycle: batches.reduce((sum, batch) => sum + batch.selected, 0),
    ...after,
  }));

  if (batches.every((batch) => batch.selected === 0) && after.pending > 0) {
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

async function invokeBatch() {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-sync-secret": syncSecret,
        },
        body: "{}",
        signal: AbortSignal.timeout(150_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      return await response.json();
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }
  throw new Error("Lote não executado.");
}

async function counts() {
  const [total, synced, pending, errors, active] = await Promise.all([
    countQuery(),
    countQuery((query) => query.not("synced_at", "is", null)),
    countQuery((query) => query.is("synced_at", null).is("sync_error", null)),
    countQuery((query) => query.not("sync_error", "is", null)),
    countQuery((query) => query.eq("active", true)),
  ]);
  return { total, synced, pending, errors, active };
}

async function countQuery(filter = (query) => query) {
  const query = filter(supabase.from("products").select("id", { count: "exact", head: true }));
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
