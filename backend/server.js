import "dotenv/config";
import mongoose from "mongoose";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_CONNECTIONSTRING)
  .then(() => {
    console.log("Đã kết nối MongoDB");
    app.listen(PORT, () => console.log(`Server chạy tại cổng ${PORT}`));
  })
  .catch((err) => {
    console.error("Lỗi kết nối DB:", err.message);
    process.exit(1);
  });
