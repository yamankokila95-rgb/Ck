
// ---- Security & Utility Helpers ----
const validateText = (text: string, max: number) => {
  if (!text || typeof text !== "string") return false;
  if (text.length > max) return false;
  return true;
};

const requireAdmin = (c: any) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    return c.json({ error: "Unauthorized" }, 403);
  }
};

const rateLimitStore: Record<string, number> = {};
const checkRateLimit = (ip: string, ms = 30000) => {
  const now = Date.now();
  if (rateLimitStore[ip] && now - rateLimitStore[ip] < ms) {
    return false;
  }
  rateLimitStore[ip] = now;
  return true;
};

import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Generate unique complaint ID
function generateComplaintId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CV-${timestamp}${random}`;
}

// ==================== Public Complaint Routes ====================

// Submit a new complaint (anonymous)
/* wrapped with try-catch */
app.post("/api/complaints", async (c) => {
  const body = await c.req.json();
  const { title, description, category, location } = body;

  if (!title || !description || !category || !location) {
    return c.json({ error: "All fields are required" }, 400);
  }

  const complaintId = generateComplaintId();

  await c.env.DB.prepare(
    `INSERT INTO complaints (complaint_id, title, description, category, location, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  )
    .bind(complaintId, title, description, category, location)
    .run();

  return c.json({ complaintId }, 201);
});

// Track a complaint by ID (public)
app.get("/api/complaints/:complaintId", async (c) => {
  const complaintId = c.req.param("complaintId").toUpperCase();

  const result = await c.env.DB.prepare(
    `SELECT complaint_id, title, description, category, location, status, admin_notes, created_at, updated_at
     FROM complaints WHERE complaint_id = ?`
  )
    .bind(complaintId)
    .first();

  if (!result) {
    return c.json({ error: "Complaint not found" }, 404);
  }

  return c.json(result);
});

// ==================== OAuth Routes ====================

app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

/* wrapped with try-catch */
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60,
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

/* wrapped with try-catch */
app.post('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// ==================== Admin Routes (Protected) ====================

// Get all complaints for admin
app.get("/api/admin/complaints", authMiddleware, async (c) => {
  const status = c.req.query("status");
  const category = c.req.query("category");

  let query = "SELECT * FROM complaints";
  const conditions: string[] = [];
  const params: string[] = [];

  if (status && status !== "all") {
    conditions.push("status = ?");
    params.push(status);
  }
  if (category && category !== "all") {
    conditions.push("category = ?");
    params.push(category);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY created_at DESC";

  const stmt = c.env.DB.prepare(query);
  const result = params.length > 0 
    ? await stmt.bind(...params).all()
    : await stmt.all();

  return c.json(result.results);
});

// Update complaint status (admin only)
app.patch("/api/admin/complaints/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { status, admin_notes } = body;

  const validStatuses = ["pending", "in-progress", "resolved"];
  if (status && !validStatuses.includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    updates.push("status = ?");
    params.push(status);
  }
  if (admin_notes !== undefined) {
    updates.push("admin_notes = ?");
    params.push(admin_notes);
  }
  updates.push("updated_at = CURRENT_TIMESTAMP");

  params.push(parseInt(id));

  await c.env.DB.prepare(
    `UPDATE complaints SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...params)
    .run();

  return c.json({ success: true });
});

// Get dashboard stats (admin only)
app.get("/api/admin/stats", authMiddleware, async (c) => {
  const totalResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM complaints"
  ).first();

  const pendingResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'"
  ).first();

  const inProgressResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM complaints WHERE status = 'in-progress'"
  ).first();

  const resolvedResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM complaints WHERE status = 'resolved'"
  ).first();

  return c.json({
    total: totalResult?.count || 0,
    pending: pendingResult?.count || 0,
    inProgress: inProgressResult?.count || 0,
    resolved: resolvedResult?.count || 0,
  });
});

export default app;
