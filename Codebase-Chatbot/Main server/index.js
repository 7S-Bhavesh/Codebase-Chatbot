import express from "express";
import dotenv from "dotenv";
import { connectSequelize } from "./db/sequelize.js";
import routes from "./routes/index.js";

import "./models/authModel.js";
import "./models/repoInputModel.js";
import "./models/chatModel.js";
import "./models/promptModel.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET environment variable");
  process.exit(1);
}

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_URL || "http://localhost:3000"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use("/api", routes);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

app.get("/", (req, res) => res.send("Server running"));

async function startServer() {
  try {
    await connectSequelize();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
