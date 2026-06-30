import { Env } from './index';

// --- Cryptographic Security Helpers ---

/**
 * Derives a secure, verifiable hex hash using the native Web Crypto API.
 * This ensures plain-text passwords are never stored in Cloudflare D1.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates a simple, unsigned Base64Url session reference string.
 * Safe to transmit via HTTP-only context layers.
 */
function generateSessionToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- API Request Router Handlers ---

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }

  try {
    const { email, password } = await request.json() as any;
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Missing email or password" }), { status: 400 });
    }

    // Check if user already exists
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first();

    if (existingUser) {
      return new Response(JSON.stringify({ error: "Account already exists" }), { status: 409 });
    }

    // Process credentials securely
    const userId = crypto.randomUUID();
    const secureHash = await hashPassword(password);

    // Write record to D1
    await env.DB.prepare(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
    ).bind(userId, email, secureHash).run();

    return new Response(JSON.stringify({ status: "success", message: "User registered" }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Server processing failure", details: err.message }), { status: 500 });
  }
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }

  try {
    const { email, password } = await request.json() as any;
    const secureHash = await hashPassword(password);

    // Look up user credentials matching the derived secure hash
    const user = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ? AND password_hash = ?"
    ).bind(email, secureHash).first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid credentials validated" }), { status: 401 });
    }

    // Issue session token reference
    const sessionToken = generateSessionToken();

    // Set cookie headers natively for static layout interactions
    const responseBody = JSON.stringify({ status: "success", user: { id: user.id, email } });
    
    return new Response(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // HTTP-Only flags prevent JavaScript from accessing the cookie, shutting down XSS attacks
        "Set-Cookie": `atlas_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Authentication system mismatch" }), { status: 500 });
  }
}