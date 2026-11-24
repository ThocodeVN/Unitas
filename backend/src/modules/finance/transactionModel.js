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
