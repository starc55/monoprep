import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import examRoutes from "./routes/exam.routes.js";
import sectionRoutes from "./routes/section.routes.js";
import questionRoutes from "./routes/question.routes.js";
import attemptRoutes from "./routes/attempt.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import supportRoutes from "./routes/support.routes.js";
import passageRoutes from "./routes/passage.routes.js";
import optionRoutes from "./routes/option.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import mentorRoutes from "./routes/mentor.routes.js";
import questionBankRoutes from "./routes/questionBank.routes.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  const localClientUrls = ["http://localhost:5173", "http://127.0.0.1:5173"];
  const allowedOrigins = new Set(
    [env.clientUrl, ...(!env.isProduction ? localClientUrls : [])].filter(Boolean)
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "6mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/exams", examRoutes);
  app.use("/api/sections", sectionRoutes);
  app.use("/api/questions", questionRoutes);
  app.use("/api/passages", passageRoutes);
  app.use("/api/options", optionRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/mentors", mentorRoutes);
  app.use("/api/question-bank", questionBankRoutes);
  app.use("/api/attempts", attemptRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
