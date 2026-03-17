import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import db from "./database.js";
import complaintsRouter from "./routes/complaints.js";
import authRouter from "./routes/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", complaintsRouter);
app.use("/api", authRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
