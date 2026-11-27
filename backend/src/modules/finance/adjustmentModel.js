import mongoose from "mongoose";

// Yêu cầu điều chỉnh số dư: thủ quỹ gửi, TẤT CẢ thành viên duyệt thì số dư mới đổi.
// PENDING  -> đang chờ duyệt
// APPROVED -> mọi người đã duyệt, đã áp dụng vào quỹ
// REJECTED -> có người từ chối
// CANCELLED -> thủ quỹ hủy
// OUTDATED -> số dư đã thay đổi trong lúc chờ nên không áp dụng nữa
const adjustmentSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    source: { type: String, enum: ["CASH", "ACCOUNT"], required: true },
    oldBalance: { type: Number, required: true, min: 0 },
    newBalance: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 240 },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "OUTDATED"],
      default: "PENDING",
    },
    resolvedAt: { type: Date, default: null },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  { timestamps: true },
);

// Mỗi phần quỹ (tiền mặt / tài khoản) chỉ có tối đa một yêu cầu đang chờ
adjustmentSchema.index(
  { room: 1, source: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } },
);

export default mongoose.model("FundAdjustment", adjustmentSchema);
