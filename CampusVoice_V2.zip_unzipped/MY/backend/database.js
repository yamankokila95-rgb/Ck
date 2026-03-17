import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("complaints.db");

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Complaints table — added passphrase, priority, attachment columns
db.prepare(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'Submitted',
    priority TEXT DEFAULT 'Medium',
    passphrase TEXT NOT NULL,
    attachment TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Admin comments table
db.prepare(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER NOT NULL,
    message TEXT NOT NULL,
    adminName TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaintId) REFERENCES complaints(id)
  )
`).run();

// Admins table — seeded, never created via frontend
db.prepare(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    department TEXT DEFAULT 'General',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Seed default admin only if no admins exist
const adminCount = db.prepare("SELECT COUNT(*) as count FROM admins").get();
if (adminCount.count === 0) {
  const hashed = bcrypt.hashSync("Admin@123", 10);
  db.prepare(
    "INSERT INTO admins (name, email, password, department) VALUES (?, ?, ?, ?)"
  ).run("Campus Admin", "admin@campus.com", hashed, "Administration");
  console.log("✅ Default admin seeded: admin@campus.com / Admin@123");
}

console.log("✅ Database ready");
export default db;
