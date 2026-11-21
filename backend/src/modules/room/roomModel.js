import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: [true, "Room name is required"],
    maxlength: [100, "Room name cannot exceed 100 characters"],
    trim: true,
  },
  // Mã mời (thêm mới): người khác nhập mã này để vào phòng
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  createDate: {
    type: Date,
    default: Date.now,
  },
  listMember: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  expenseList: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
    },
  ],
  transactionHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
  ],
  fundBalance: {
    type: Number,
    default: 0,
    min: [0, "Fund balance cannot be negative"],
  },
});

const Room = mongoose.model("Room", roomSchema);

export default Room;
