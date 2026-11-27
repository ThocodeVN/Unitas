import mongoose from "mongoose";

// Một dòng = một thông báo gửi tới MỘT người
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },
    // Nhóm sự kiện để giao diện chọn biểu tượng: ROOM | FUND | DUTY | ACCOUNT
    type: {
      type: String,
      enum: ["ROOM", "FUND", "DUTY", "ACCOUNT"],
      required: true,
    },
    message: { type: String, required: true, maxlength: 300 },
    link: { type: String, default: "" }, // trang liên quan, vd "/quy-chung"
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, createdAt: -1 });
// Tự xóa thông báo cũ hơn 60 ngày
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 86_400 });

export default mongoose.model("Notification", notificationSchema);
