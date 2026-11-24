import mongoose from "mongoose";

const dutySchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Lưu ngày dạng "YYYY-MM-DD" (giờ Việt Nam) để không lệch múi giờ
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    // Khung giờ "HH:mm", để trống = trong ngày
    from: { type: String, default: "" },
    to: { type: String, default: "" },
    status: { type: String, enum: ["TODO", "DONE"], default: "TODO" },
    doneAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

dutySchema.index({ room: 1, date: 1 });

export default mongoose.model("Duty", dutySchema);
