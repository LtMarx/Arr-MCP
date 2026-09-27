// Container healthcheck. Uses only node builtins, so it needs no extra tools
// and — unlike wget — ignores any http_proxy env var and never resolves
// "localhost" to ::1 (the server binds 0.0.0.0, which is IPv4 only).
//
// stdio mode has no HTTP server, so there is nothing to probe: exit 0.
// http mode probes GET /health on the configured port.
//
// Set HEALTHCHECK_DEEP=1 to also require every configured *ARR service to
// answer. Off by default so a briefly unreachable Radarr does not mark the
// container itself as unhealthy.

import { get } from "node:http";

if ((process.env.MCP_TRANSPORT ?? "stdio") !== "http") {
  process.exit(0);
}

const port = process.env.MCP_PORT ?? "3000";
const deep = ["1", "true", "yes"].includes((process.env.HEALTHCHECK_DEEP ?? "").toLowerCase());
const path = deep ? "/health?deep=1" : "/health";

const req = get(
  { host: "127.0.0.1", port, path, timeout: 4000 },
  (res) => {
    // Drain so the socket closes cleanly.
    res.resume();
    process.exit(res.statusCode === 200 ? 0 : 1);
  }
);

req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});

req.on("error", () => process.exit(1));
