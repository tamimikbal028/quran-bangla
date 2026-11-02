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
            return sendJson(400, {
              ok: false,
              error: "ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।",
            });
          }

          const record = store.get(username);
          if (!record) {
            return sendJson(404, {
              ok: false,
              error:
                "এই নামে কোনো অ্যাকাউন্ট পাওয়া যায়নি। আগে রেজিস্ট্রেশন করুন।",
            });
          }

          if (record.pinHash !== passwordHash) {
            return sendJson(401, {
              ok: false,
              error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।",
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
              const username = (parsed.username || parsed.syncKey || "")
                .trim()
                .toLowerCase();
              const passwordHash = (
                parsed.passwordHash ||
                parsed.pinHash ||
                ""
              ).trim();
              const data = parsed.data;
              const now = Date.now();

              if (!username || !passwordHash) {
                return sendJson(400, {
                  ok: false,
                  error: "ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।",
                });
              }

              const existing = store.get(username);

              if (action === "register") {
                if (existing) {
                  return sendJson(409, {
                    ok: false,
                    error:
                      "এই নামে ইতিমধ্যে অ্যাকাউন্ট রয়েছে। লগইন করুন অথবা অন্য নাম বেছে নিন।",
                  });
                }
                store.set(username, {
                  pinHash: passwordHash,
                  data: JSON.stringify(data || {}),
                  updatedAt: now,
                });
                return sendJson(200, {
                  ok: true,
                  isNew: true,
                  message: "অভিনন্দন! অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।",
                  data: data || null,
                });
              }

              if (action === "login" || action === "connect") {
                if (!existing) {
                  return sendJson(404, {
                    ok: false,
                    error:
                      "এই নামে কোনো অ্যাকাউন্ট পাওয়া যায়নি। আগে নতুন অ্যাকাউন্ট তৈরি (Register) করুন।",
                  });
                }
                if (existing.pinHash !== passwordHash) {
                  return sendJson(401, {
                    ok: false,
                    error: "ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।",
                  });
                }
                return sendJson(200, {
                  ok: true,
                  isNew: false,
                  message: "সফলভাবে লগইন হয়েছে!",
                  data: JSON.parse(existing.data),
                  updatedAt: existing.updatedAt,
                });
              }

              if (action === "push") {
                if (!existing) {
                  store.set(username, {
                    pinHash: passwordHash,
                    data: JSON.stringify(data || {}),
                    updatedAt: now,
                  });
                  return sendJson(200, {
                    ok: true,
                    message: "ডাটা সেভ হয়েছে।",
                  });
                }
                if (existing.pinHash !== passwordHash) {
                  return sendJson(401, {
                    ok: false,
                    error: "ভুল ক্রেডেনশিয়াল।",
                  });
                }
                existing.data = JSON.stringify(data || {});
                existing.updatedAt = now;
                store.set(username, existing);
                return sendJson(200, {
                  ok: true,
                  message: "ডাটা সেভ হয়েছে।",
                });
              }

              if (action === "pull") {
                if (!existing || existing.pinHash !== passwordHash) {
                  return sendJson(401, {
                    ok: false,
                    error: "অননুমোদিত রিকোয়েস্ট।",
                  });
                }
                return sendJson(200, {
                  ok: true,
                  data: JSON.parse(existing.data),
                  updatedAt: existing.updatedAt,
                });
              }

              return sendJson(400, { ok: false, error: "Unknown action" });
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
