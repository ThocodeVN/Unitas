import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: { type: String, enum: ["UNPAID", "PAID"], default: "UNPAID" },
    paidAt: { type: Date, default: null },
  },
  { _id: false },
);

const contributionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 1 }, // số tiền mỗi người
    dueDate: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payments: [paymentSchema],
  },
  { timestamps: true },
);

export default mongoose.model("Contribution", contributionSchema);
