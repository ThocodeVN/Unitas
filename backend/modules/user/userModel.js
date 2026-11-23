
import mongoose from "mongoose";
import Room from "../room/roomModel.js";

const UserSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: [true, "Username is required"],
        trim: true
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: [true, "Password is required"],
        select: false
    },

    phoneNumber: {
        type: String,
        trim: true
    },

    dayOfBirth: {
        type: Date
    },

    avatar: {
        type: String,
        default: ""
    },

    gender: {
        type: String
    },

    roomJoined: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        default: null
    },

    roleInRoom: {
        type: String,
        enum: ["TREASURER", "MEMBER", "NONE"],
        default: "MEMBER"
    }
});

const User = mongoose.model("User", UserSchema);

export default User;
