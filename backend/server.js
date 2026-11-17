import express from "express";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import roomRouter from "./modules/room/roomRoutes.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

const app = express();

// middlewares
app.use(express.json());
app.use("/api/rooms", roomRouter);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`server bắt đầu trên cổng ${PORT}`);
  });
});
