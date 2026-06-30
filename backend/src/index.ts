import { handleAuth } from './auth';
import { runNewsPipeline } from './pipeline';

export interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
}

export default {
  // Handles incoming HTTP requests from the frontend
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Cross-Origin Resource Sharing (CORS) preflight security headers
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "https://project-atlas.pages.dev", // Your Frontend URL
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }

    if (url.pathname.startsWith("/api/v1/auth")) {
      return handleAuth(request, env);
    }

    if (url.pathname === "/api/v1/dashboard/brief") {
      const { results } = await env.DB.prepare("SELECT * FROM articles ORDER BY published_at DESC LIMIT 10").all();
      return Response.json({ status: "success", briefing: results });
    }

    return new Response("Not Found", { status: 404 });
  },

  // Handles the automated 6 AM daily pipeline routine
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    // Alternative handler for Queue operations if needed
  },
  
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron trigger fired at: ${event.scheduledTime}`);
    ctx.waitUntil(runNewsPipeline(env));
  }
};