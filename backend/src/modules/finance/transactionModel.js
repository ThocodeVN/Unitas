import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["IN", "OUT"], required: true },
    amount: { type: Number, required: true, min: 1 },
    // Tiền vào/ra từ phần nào của quỹ. Giao dịch cũ không có trường này = tài khoản
    source: { type: String, enum: ["CASH", "ACCOUNT"], default: "ACCOUNT" },
    // ADJUSTMENT = điều chỉnh số dư đã được cả phòng duyệt
    // TRANSFER = chuyển giữa tiền mặt và tài khoản (một cặp OUT + IN)
    // Hai loại này không tính là thu/chi
    kind: {
      type: String,
      enum: ["NORMAL", "ADJUSTMENT", "TRANSFER"],
      default: "NORMAL",
    },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    contribution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contribution",
      default: null,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Transaction", transactionSchema);
