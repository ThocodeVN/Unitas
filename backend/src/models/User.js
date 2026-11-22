import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, default: "" },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 4,
      maxlength: 30,
    },
    password: { type: String, select: false },
    avatar: { type: String, default: "" },
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // Phòng đang ở (mỗi người một phòng)
    roomJoined: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    roleInRoom: {
      type: String,
      enum: ["TREASURER", "MEMBER", "NONE"],
      default: "NONE",
    },
  },
  { timestamps: true },
);

// Khi trả user về cho frontend: không bao giờ kèm các trường bí mật
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
