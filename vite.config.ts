import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Local development mock for /api/sync so PC & Mobile can sync on local network
function localSyncMockPlugin(): Plugin {
  const store = new Map<
    string,
    { pinHash: string; data: string; updatedAt: number }
  >();

  return {
    name: "local-sync-mock",
    configureServer(server) {
      server.middlewares.use("/api/sync", async (req, res) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);

        // Helper to send JSON
        const sendJson = (status: number, payload: any) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        if (req.method === "GET") {
          const syncKey = url.searchParams.get("key")?.trim().toLowerCase();
          const pinHash = url.searchParams.get("pinHash")?.trim();

          if (!syncKey || !pinHash) {
            return sendJson(400, {
              ok: false,
              error: "Sync Key এবং Pin Hash প্রয়োজন।",
            });
          }

          const record = store.get(syncKey);
          if (!record) {
            return sendJson(404, {
              ok: false,
              error: "এই কি (Key) দিয়ে কোনো ডাটা পাওয়া যায়নি।",
            });
          }

          if (record.pinHash !== pinHash) {
            return sendJson(401, {
              ok: false,
              error: "ভুল পিন! সঠিক ৪ ডিজিটের গোপন পিন দিন।",
            });
          }

          return sendJson(200, {
            ok: true,
            data: JSON.parse(record.data),
            updatedAt: record.updatedAt,
          });
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });

          req.on("end", () => {
            try {
              const parsed = JSON.parse(body || "{}");
              const action = parsed.action || "push";
              const syncKey = parsed.syncKey?.trim().toLowerCase();
              const pinHash = parsed.pinHash?.trim();
              const data = parsed.data;
              const now = Date.now();

              if (!syncKey || !pinHash) {
                return sendJson(400, {
                  ok: false,
                  error: "Sync Key এবং Pin Hash প্রয়োজন।",
                });
              }

              const existing = store.get(syncKey);

              if (!existing) {
                // Register
                store.set(syncKey, {
                  pinHash,
                  data: JSON.stringify(data || {}),
                  updatedAt: now,
                });
                return sendJson(200, {
                  ok: true,
                  isNew: true,
                  message: "নতুন Sync একাউন্ট তৈরি হয়েছে।",
                  data: data || null,
                });
              }

              if (existing.pinHash !== pinHash) {
                return sendJson(401, {
                  ok: false,
                  error: "ভুল পিন! সঠিক ৪ ডিজিটের গোপন পিন দিন।",
                });
              }

              if (action === "connect") {
                return sendJson(200, {
                  ok: true,
                  isNew: false,
                  message: "সফলভাবে সংযুক্ত হয়েছে।",
                  data: JSON.parse(existing.data),
                  updatedAt: existing.updatedAt,
                });
              }

              existing.data = JSON.stringify(data || {});
              existing.updatedAt = now;
              store.set(syncKey, existing);

              return sendJson(200, {
                ok: true,
                message: "ডাটা সফলভাবে সেভ হয়েছে।",
              });
            } catch {
              return sendJson(400, {
                ok: false,
                error: "অবৈধ JSON রিকোয়েস্ট।",
              });
            }
          });
          return;
        }

        sendJson(405, { ok: false, error: "Method not allowed" });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localSyncMockPlugin()],
  server: {
    host: true,
  },
});
