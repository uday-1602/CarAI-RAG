import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

const app = express();
const PORT = 3000;
const LAMBDA_URL = process.env.LAMBDA_URL || "https://fzcox5d4gzzsuubdejo7gwrfly0hgjrc.lambda-url.us-east-1.on.aws";

async function startServer() {
  app.use(express.json());

  // Proxy endpoint for Lambda Chat
  app.post("/api/chat", async (req, res) => {
    const { prompt } = req.body;
    console.log(`Received chat request for: "${prompt}"`);
    
    try {
      const lambdaEndpoint = `${LAMBDA_URL.replace(/\/$/, "")}/chat`;
      console.log(`Forwarding to Lambda: ${lambdaEndpoint}`);

      // Using native fetch (Node 18+)
      const response = await fetch(lambdaEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Lambda error (${response.status}):`, errorText);
        return res.status(response.status).json({ 
          error: `Lambda returned ${response.status}`,
          details: errorText 
        });
      }

      // Set headers for streaming
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering

      // Convert Web Stream to Node Stream and pipe directly to response
      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.end();
      }

    } catch (error) {
      console.error("Proxy connection error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Car AI backend",
        details: error.message 
      });
    }
  });

  // Health check for the proxy
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", proxyingTo: LAMBDA_URL });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Proxying chat requests to: ${LAMBDA_URL}`);
  });
}

startServer();
