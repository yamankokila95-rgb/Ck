import express from "express";
import multer from "multer";
import path from "path";
import { requireAdmin } from "../middleware/auth.js";
import db from "../database.js";

const router = express.Router();

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "backend/uploads/"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error("Only images and PDFs are allowed"));
  },
});

// Passphrase generator — readable words, no personal info
const adjectives = ["blue","red","green","swift","quiet","brave","calm","dark","tiny","wild"];
const nouns = ["river","stone","cloud","flame","tiger","hawk","cedar","ocean","frost","maple"];
const generatePassphrase = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}-${noun}-${num}`;
};

// POST /api/complaints — submit new complaint
router.post("/complaints", upload.single("attachment"), (req, res) => {
  try {
    const { title, description, category, location, priority } = req.body;
    if (!title || !description || !category || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const passphrase = generatePassphrase();
    const attachment = req.file ? req.file.filename : null;

    const result = db.prepare(`
      INSERT INTO complaints (title, description, category, location, status, priority, passphrase, attachment)
      VALUES (?, ?, ?, ?, 'Submitted', ?, ?, ?)
    `).run(title, description, category, location, priority || "Medium", passphrase, attachment);

    res.json({ id: result.lastInsertRowid, passphrase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/complaints — admin: all complaints with optional filters
router.get("/complaints", requireAdmin, (req, res) => {
  try {
    const { status, category, location, priority, search, from, to } = req.query;
    let query = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (status)   { query += " AND status = ?";   params.push(status); }
    if (category) { query += " AND category = ?"; params.push(category); }
    if (location) { query += " AND location = ?"; params.push(location); }
    if (priority) { query += " AND priority = ?"; params.push(priority); }
    if (search)   { query += " AND (title LIKE ? OR description LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    if (from)     { query += " AND date(createdAt) >= ?"; params.push(from); }
    if (to)       { query += " AND date(createdAt) <= ?"; params.push(to); }

    query += " ORDER BY createdAt DESC";
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/:id — public, fetch by numeric id
router.get("/complaints/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT id,title,description,category,location,status,priority,attachment,createdAt FROM complaints WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Complaint not found" });
    const comments = db.prepare("SELECT * FROM comments WHERE complaintId = ? ORDER BY createdAt ASC").all(row.id);
    res.json({ ...row, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/passphrase/:phrase — student track by passphrase
router.get("/complaints/passphrase/:phrase", (req, res) => {
  try {
    const row = db.prepare("SELECT id,title,description,category,location,status,priority,attachment,createdAt FROM complaints WHERE passphrase = ?").get(req.params.phrase);
    if (!row) return res.status(404).json({ error: "No complaint found for this passphrase" });
    const comments = db.prepare("SELECT * FROM comments WHERE complaintId = ? ORDER BY createdAt ASC").all(row.id);
    res.json({ ...row, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/complaints/:id — update status/priority
router.patch("/admin/complaints/:id", requireAdmin, (req, res) => {
  try {
    const { status, priority } = req.body;
    const VALID_STATUSES = ["Submitted", "in-progress", "resolved"];
    const VALID_PRIORITIES = ["Low", "Medium", "High"];

    if (status && !VALID_STATUSES.includes(status))   return res.status(400).json({ error: "Invalid status" });
    if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: "Invalid priority" });

    const fields = [];
    const params = [];
    if (status)   { fields.push("status = ?");   params.push(status); }
    if (priority) { fields.push("priority = ?"); params.push(priority); }
    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

    params.push(req.params.id);
    const result = db.prepare(`UPDATE complaints SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    if (result.changes === 0) return res.status(404).json({ error: "Complaint not found" });
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/complaints/:id/comments — admin adds comment
router.post("/admin/complaints/:id/comments", requireAdmin, (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Comment cannot be empty" });

    const complaint = db.prepare("SELECT id FROM complaints WHERE id = ?").get(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });

    db.prepare("INSERT INTO comments (complaintId, message, adminName) VALUES (?, ?, ?)").run(
      req.params.id, message.trim(), req.admin.name
    );
    res.json({ message: "Comment added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics — admin dashboard stats
router.get("/analytics", requireAdmin, (req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as count FROM complaints").get().count;
    const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM complaints GROUP BY status").all();
    const byCategory = db.prepare("SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC").all();
    const byLocation = db.prepare("SELECT location, COUNT(*) as count FROM complaints GROUP BY location ORDER BY count DESC").all();
    const byPriority = db.prepare("SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority").all();
    const byMonth = db.prepare(`
      SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as count
      FROM complaints GROUP BY month ORDER BY month DESC LIMIT 6
    `).all();
    res.json({ total, byStatus, byCategory, byLocation, byPriority, byMonth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
