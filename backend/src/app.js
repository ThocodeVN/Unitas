import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(
  cors({
    origin: [process.env.CLIENT_URL, "https://unitas-sigma.vercel.app"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Unitas backend đang chạy" });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Không tìm thấy đường dẫn" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Lỗi máy chủ" });
});

export default app;
