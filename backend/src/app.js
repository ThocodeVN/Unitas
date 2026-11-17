import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: [process.env.CLIENT_URL, "https://unitas-sigma.vercel.app"],
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Unitas backend đang chạy" });
});

export default app;
