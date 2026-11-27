import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: [true, "Room name is required"],
    maxlength: [100, "Room name cannot exceed 100 characters"],
    trim: true,
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  createDate: { type: Date, default: Date.now },
  listMember: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // Người đã nhập mã mời, đang chờ thủ quỹ duyệt
  pendingMembers: [
    {
      _id: false,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      requestedAt: { type: Date, default: Date.now },
    },
  ],
  expenseList: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseCategory" },
  ],
  transactionHistory: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  ],
  fundBalance: {
    type: Number,
    default: 0,
    min: [0, "Fund balance cannot be negative"],
  },
  // Phần tiền mặt trong quỹ. Tiền tài khoản = fundBalance - cashBalance
  cashBalance: {
    type: Number,
    default: 0,
    min: [0, "Cash balance cannot be negative"],
  },
});

export default mongoose.model("Room", roomSchema);
