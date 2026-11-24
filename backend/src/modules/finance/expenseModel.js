import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "Điện nước",
  "Internet",
  "Ăn uống",
  "Đồ dùng chung",
  "Sửa chữa",
  "Khác",
];

const expenseSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: "Khác" },
    date: { type: Date, required: true }, // ngày chi thực tế
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
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

export default mongoose.model("Expense", expenseSchema);
