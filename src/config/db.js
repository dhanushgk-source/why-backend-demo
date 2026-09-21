require("dotenv").config();
const dns = require("dns");
const { Pool } = require("pg");

// Configure public DNS servers (Google 8.8.8.8 & Cloudflare 1.1.1.1) to bypass local ISP DNS refusal locally
if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
    const origLookup = dns.lookup;
    dns.lookup = function (hostname, options, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      if (typeof hostname === "string" && hostname.includes("neon.tech")) {
        return dns.resolve(hostname, (err, addrs) => {
          if (!err && addrs && addrs.length > 0) {
            if (options && options.all) {
              return callback(null, addrs.map((a) => ({ address: a, family: 4 })));
            }
            return callback(null, addrs[0], 4);
          }
          return origLookup(hostname, options, callback);
        });
      }
      return origLookup(hostname, options, callback);
    };
  } catch (e) {
    console.warn("⚠️ Custom DNS resolver setup warning:", e.message);
  }
}

let rawUrl = process.env.DATABASE_URL || "";
// Strip query string params (e.g. ?sslmode=require) that override pg pool SSL options
const dbUrl = rawUrl.includes("?") ? rawUrl.split("?")[0] : rawUrl;
const useSsl = process.env.DB_SSL === "true" || (rawUrl && !rawUrl.includes("localhost") && !rawUrl.includes("127.0.0.1") && !rawUrl.includes("sslmode=disable") && process.env.DB_SSL !== "false");

// Initialize PostgreSQL Connection Pool with clean SSL options
const pool = new Pool({
  connectionString: dbUrl || undefined,
  ssl: useSsl
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("⚠️ Idle PostgreSQL client error:", err.message);
});

module.exports = pool;
