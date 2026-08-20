// Simple Asiacell proxy server
// Run on a server with a clean IP that Asiacell trusts
// Usage: node proxy-server.js
// Then set ASIACELL_PROXY_URL in Vercel env to: http://YOUR_SERVER_IP:3000

// This standalone Node proxy intentionally uses CommonJS so it runs with `node proxy-server.js`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require("http");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require("https");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const url = require("url");

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Only POST allowed" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { url: targetUrl, method, headers, body: targetBody } = JSON.parse(body);
      if (!targetUrl) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "url is required" }));
        return;
      }

      console.log(`[Proxy] ${method || "GET"} ${targetUrl}`);

      const parsed = url.parse(targetUrl);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.path,
        method: method || "GET",
        headers: headers || {},
      };

      const proxyReq = client.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          res.end(data);
          console.log(`[Proxy Response] ${proxyRes.statusCode} ${targetUrl} - ${data.length} bytes`);
        });
      });

      proxyReq.on("error", (err) => {
        console.error("[Proxy Error]", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });

      if (targetBody) {
        proxyReq.write(targetBody);
      }
      proxyReq.end();
    } catch (err) {
      console.error("[Proxy Error]", err.message);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Asiacell Proxy] Listening on port ${PORT}`);
  console.log(`[Asiacell Proxy] Set ASIACELL_PROXY_URL=http://YOUR_SERVER_IP:${PORT} in Vercel environment variables`);
});
