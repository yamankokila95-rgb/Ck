import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "campusvoice-secret-key-2024";

export const requireAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

export { JWT_SECRET };
