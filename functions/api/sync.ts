// Cloudflare Pages Function: /api/sync
// Simple & Reliable User Account & Auto-Sync System using Cloudflare D1 (with KV fallback)

interface Env {
  DB?: D1Database; // Cloudflare D1 Database binding
  SYNC_KV?: KVNamespace; // Cloudflare KV binding
}

interface UserRecord {
  pin_hash: string;
  data: string;
  updated_at: number;
}

// Ensure SQLite table exists
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

// GET /api/sync?username=...&passwordHash=...
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const username = (
    url.searchParams.get("username") ||
    url.searchParams.get("key") ||
    ""
  )
    .trim()
    .toLowerCase();
  const passwordHash = (
    url.searchParams.get("passwordHash") ||
    url.searchParams.get("pinHash") ||
    ""
  ).trim();

  if (!username || !passwordHash) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { DB, SYNC_KV } = context.env;

  // 1. D1 Database
  if (DB) {
    try {
      await ensureD1Table(DB);
      const row = await DB.prepare(
        "SELECT pin_hash, data, updated_at FROM sync_store WHERE sync_key = ?",
      )
        .bind(username)
        .first<UserRecord>();

      if (!row) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "এই নামে কোনো অ্যাকাউন্ট পাওয়া যায়নি। আগে রেজিস্ট্রেশন করুন।",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      if (row.pin_hash !== passwordHash) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।",
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
          error: "D1 ডাটাবেজ সমস্যা: " + (e?.message || e),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 2. Fallback KV
  if (SYNC_KV) {
    try {
      const raw = await SYNC_KV.get(`user_${username}`);
      if (!raw) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "এই নামে কোনো অ্যাকাউন্ট পাওয়া যায়নি।",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const record: UserRecord = JSON.parse(raw);
      if (record.pin_hash !== passwordHash) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।",
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
        JSON.stringify({ ok: false, error: "KV সমস্যা: " + (e?.message || e) }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: "Cloudflare D1 ডাটাবেজ বাইন্ডিং 'DB' পাওয়া যায়নি।",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
};

// POST /api/sync
// Supported actions: "login", "register", "push", "pull"
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
  const username = (body.username || body.syncKey || "").trim().toLowerCase();
  const passwordHash = (body.passwordHash || body.pinHash || "").trim();
  const data = body.data;
  const now = Date.now();

  if (!username || !passwordHash) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { DB, SYNC_KV } = context.env;

  // 1. D1 Database
  if (DB) {
    try {
      await ensureD1Table(DB);

      // Check existing user
      const existing = await DB.prepare(
        "SELECT pin_hash, data, updated_at FROM sync_store WHERE sync_key = ?",
      )
        .bind(username)
        .first<UserRecord>();

      // ACTION: REGISTER
      if (action === "register") {
        if (existing) {
          return new Response(
            JSON.stringify({
              ok: false,
              error:
                "এই নামে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। লগইন করুন অথবা অন্য নাম বেছে নিন।",
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          );
        }

        const initialData = JSON.stringify(data || {});
        await DB.prepare(
          "INSERT INTO sync_store (sync_key, pin_hash, data, updated_at) VALUES (?, ?, ?, ?)",
        )
          .bind(username, passwordHash, initialData, now)
          .run();

        return new Response(
          JSON.stringify({
            ok: true,
            isNew: true,
            message: "অভিনন্দন! অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।",
            data: data || null,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // ACTION: LOGIN
      if (action === "login" || action === "connect") {
        if (!existing) {
          return new Response(
            JSON.stringify({
              ok: false,
              error:
                "এই নামে কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে আগে নতুন অ্যাকাউন্ট তৈরি (Register) করুন।",
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        if (existing.pin_hash !== passwordHash) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।",
            }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            isNew: false,
            message: "সফলভাবে লগইন হয়েছে!",
            data: JSON.parse(existing.data),
            updatedAt: existing.updated_at,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // ACTION: PUSH (Update reading progress)
      if (action === "push") {
        if (!existing) {
          // If pushing for newly connected account
          const initialData = JSON.stringify(data || {});
          await DB.prepare(
            "INSERT INTO sync_store (sync_key, pin_hash, data, updated_at) VALUES (?, ?, ?, ?)",
          )
            .bind(username, passwordHash, initialData, now)
            .run();

          return new Response(
            JSON.stringify({ ok: true, message: "ডাটা সেভ হয়েছে।" }),
            { headers: { "Content-Type": "application/json" } },
          );
        }

        if (existing.pin_hash !== passwordHash) {
          return new Response(
            JSON.stringify({ ok: false, error: "ভুল ক্রেডেনশিয়াল।" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        const updatedData = JSON.stringify(data || {});
        await DB.prepare(
          "UPDATE sync_store SET data = ?, updated_at = ? WHERE sync_key = ?",
        )
          .bind(updatedData, now, username)
          .run();

        return new Response(
          JSON.stringify({ ok: true, message: "ডাটা সেভ হয়েছে।" }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // ACTION: PULL
      if (action === "pull") {
        if (!existing || existing.pin_hash !== passwordHash) {
          return new Response(
            JSON.stringify({ ok: false, error: "অননুমোদিত রিকোয়েস্ট।" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            ok: true,
            data: JSON.parse(existing.data),
            updatedAt: existing.updated_at,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
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

  // 2. Fallback KV
  if (SYNC_KV) {
    try {
      const raw = await SYNC_KV.get(`user_${username}`);
      const existing: UserRecord | null = raw ? JSON.parse(raw) : null;

      if (action === "register") {
        if (existing) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "এই নামে ইতিমধ্যে অ্যাকাউন্ট রয়েছে। লগইন করুন।",
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          );
        }

        const newRec: UserRecord = {
          pin_hash: passwordHash,
          data: JSON.stringify(data || {}),
          updated_at: now,
        };
        await SYNC_KV.put(`user_${username}`, JSON.stringify(newRec));

        return new Response(
          JSON.stringify({
            ok: true,
            isNew: true,
            message: "অ্যাকাউন্ট তৈরি হয়েছে!",
            data: data || null,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      if (action === "login" || action === "connect") {
        if (!existing) {
          return new Response(
            JSON.stringify({
              ok: false,
              error:
                "এই নামে কোনো অ্যাকাউন্ট পাওয়া যায়নি। আগে রেজিস্ট্রেশন করুন।",
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }
        if (existing.pin_hash !== passwordHash) {
          return new Response(
            JSON.stringify({ ok: false, error: "ভুল পাসওয়ার্ড!" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            ok: true,
            isNew: false,
            message: "লগইন সফল!",
            data: JSON.parse(existing.data),
            updatedAt: existing.updated_at,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      if (action === "push") {
        if (existing && existing.pin_hash !== passwordHash) {
          return new Response(
            JSON.stringify({ ok: false, error: "ভুল ক্রেডেনশিয়াল।" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        const updatedRec: UserRecord = {
          pin_hash: passwordHash,
          data: JSON.stringify(data || {}),
          updated_at: now,
        };
        await SYNC_KV.put(`user_${username}`, JSON.stringify(updatedRec));
        return new Response(
          JSON.stringify({ ok: true, message: "ডাটা সেভ হয়েছে।" }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
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
      error: "D1 বা KV ডাটাবেজ কানেকশন পাওয়া যায়নি।",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
};
