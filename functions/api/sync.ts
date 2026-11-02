// Cloudflare Pages Function: /api/sync
// Supports Cloudflare D1 (recommended) and Cloudflare KV as fallback

interface Env {
  DB?: D1Database; // Cloudflare D1 Database binding
  SYNC_KV?: KVNamespace; // Cloudflare KV binding
}

interface SyncRecord {
  pin_hash: string;
  data: string;
  updated_at: number;
}

// Auto-initialize SQLite table if using Cloudflare D1
async function ensureD1Table(db: D1Database) {
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS sync_store (
          sync_key TEXT PRIMARY KEY,
          pin_hash TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )`,
      )
      .run();
  } catch (err) {
    console.error("Failed to ensure D1 table", err);
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const syncKey = url.searchParams.get("key")?.trim().toLowerCase();
  const pinHash = url.searchParams.get("pinHash")?.trim();

  if (!syncKey || !pinHash) {
    return new Response(
      JSON.stringify({ ok: false, error: "Sync Key এবং Pin Hash প্রয়োজন।" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { DB, SYNC_KV } = context.env;

  // 1. D1 Database Storage
  if (DB) {
    try {
      await ensureD1Table(DB);
      const row = await DB.prepare(
        "SELECT pin_hash, data, updated_at FROM sync_store WHERE sync_key = ?",
      )
        .bind(syncKey)
        .first<SyncRecord>();

      if (!row) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "এই কি (Key) দিয়ে কোনো একাউন্ট পাওয়া যায়নি।",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      if (row.pin_hash !== pinHash) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "ভুল পিন! সঠিক ৪ ডিজিটের গোপন পিন দিন।",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          data: JSON.parse(row.data),
          updatedAt: row.updated_at,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (e: any) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "D1 ডাটাবেজ এরর: " + (e?.message || e),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 2. Fallback: Cloudflare KV Storage
  if (SYNC_KV) {
    try {
      const raw = await SYNC_KV.get(`sync_${syncKey}`);
      if (!raw) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "এই কি (Key) দিয়ে কোনো একাউন্ট পাওয়া যায়নি।",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const record: SyncRecord = JSON.parse(raw);
      if (record.pin_hash !== pinHash) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "ভুল পিন! সঠিক ৪ ডিজিটের গোপন পিন দিন।",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          data: JSON.parse(record.data),
          updatedAt: record.updated_at,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (e: any) {
      return new Response(
        JSON.stringify({ ok: false, error: "KV এরর: " + (e?.message || e) }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error:
        "Cloudflare D1 বা KV এখনো সংযুক্ত করা হয়নি। Cloudflare Dashboard -> Pages -> Settings -> Functions এ গিয়ে D1 Database binding 'DB' যুক্ত করুন।",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "অবৈধ JSON রিকোয়েস্ট।" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const action = body.action || "push";
  const syncKey = body.syncKey?.trim().toLowerCase();
  const pinHash = body.pinHash?.trim();
  const data = body.data;
  const now = Date.now();

  if (!syncKey || !pinHash) {
    return new Response(
      JSON.stringify({ ok: false, error: "Sync Key এবং Pin Hash প্রয়োজন।" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { DB, SYNC_KV } = context.env;

  // 1. D1 Database Storage
  if (DB) {
    try {
      await ensureD1Table(DB);
      const existing = await DB.prepare(
        "SELECT pin_hash, data, updated_at FROM sync_store WHERE sync_key = ?",
      )
        .bind(syncKey)
        .first<SyncRecord>();

      if (!existing) {
        // Register new sync account
        const initialData = JSON.stringify(data || {});
        await DB.prepare(
          "INSERT INTO sync_store (sync_key, pin_hash, data, updated_at) VALUES (?, ?, ?, ?)",
        )
          .bind(syncKey, pinHash, initialData, now)
          .run();

        return new Response(
          JSON.stringify({
            ok: true,
            isNew: true,
            message: "নতুন Sync একাউন্ট সফলভাবে তৈরি হয়েছে।",
            data: data || null,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // Existing record check PIN
      if (existing.pin_hash !== pinHash) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "ভুল পিন! সঠিক ৪ ডিজিটের গোপন পিন দিন।",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      if (action === "connect") {
        // Just connecting to existing device
        return new Response(
          JSON.stringify({
            ok: true,
            isNew: false,
            message: "সফলভাবে সংযুক্ত হয়েছে।",
            data: JSON.parse(existing.data),
            updatedAt: existing.updated_at,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // Update data
      const updatedData = JSON.stringify(data || {});
      await DB.prepare(
        "UPDATE sync_store SET data = ?, updated_at = ? WHERE sync_key = ?",
      )
        .bind(updatedData, now, syncKey)
        .run();

      return new Response(
        JSON.stringify({ ok: true, message: "ডাটা সফলভাবে সেভ হয়েছে।" }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (e: any) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "D1 ডাটাবেজ এরর: " + (e?.message || e),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 2. Fallback: Cloudflare KV
  if (SYNC_KV) {
    try {
      const raw = await SYNC_KV.get(`sync_${syncKey}`);
      if (!raw) {
        const record: SyncRecord = {
          pin_hash: pinHash,
          data: JSON.stringify(data || {}),
          updated_at: now,
        };
        await SYNC_KV.put(`sync_${syncKey}`, JSON.stringify(record));
        return new Response(
          JSON.stringify({
            ok: true,
            isNew: true,
            message: "নতুন Sync একাউন্ট তৈরি হয়েছে।",
            data: data || null,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      const existing: SyncRecord = JSON.parse(raw);
      if (existing.pin_hash !== pinHash) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "ভুল পিন! সঠিক ৪ ডিজিটের গোপন পিন দিন।",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      if (action === "connect") {
        return new Response(
          JSON.stringify({
            ok: true,
            isNew: false,
            message: "সফলভাবে সংযুক্ত হয়েছে।",
            data: JSON.parse(existing.data),
            updatedAt: existing.updated_at,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      existing.data = JSON.stringify(data || {});
      existing.updated_at = now;
      await SYNC_KV.put(`sync_${syncKey}`, JSON.stringify(existing));

      return new Response(
        JSON.stringify({ ok: true, message: "ডাটা সফলভাবে সেভ হয়েছে।" }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (e: any) {
      return new Response(
        JSON.stringify({ ok: false, error: "KV এরর: " + (e?.message || e) }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error:
        "Cloudflare D1 বা KV এখনো সংযুক্ত করা হয়নি। Cloudflare Dashboard -> Pages -> Settings -> Functions এ গিয়ে D1 Database binding 'DB' যুক্ত করুন।",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
};
