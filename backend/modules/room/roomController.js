import mongoose from "mongoose";
import Room from "./roomModel.js";

const editableFields = new Set([
  "roomName",
  "listMember",
  "expenseList",
  "transactionHistory",
  "fundBalance",
]);

class RoomRequestError extends Error {}

function parseRoomPayload(body, { requireRoomName = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RoomRequestError("Request body must be a JSON object.");
  }

  const unknownFields = Object.keys(body).filter((field) => !editableFields.has(field));
  if (unknownFields.length) {
    throw new RoomRequestError(`Unsupported room field: ${unknownFields.join(", ")}`);
  }

  const payload = {};
  if (requireRoomName || Object.hasOwn(body, "roomName")) {
    if (typeof body.roomName !== "string") {
      throw new RoomRequestError("roomName must be a string.");
    }

    const roomName = body.roomName.trim();
    if (!roomName || roomName.length > 100) {
      throw new RoomRequestError("roomName must contain 1 to 100 characters.");
    }
    payload.roomName = roomName;
  }

  for (const field of ["listMember", "expenseList", "transactionHistory"]) {
    if (!Object.hasOwn(body, field)) continue;
    const ids = body[field];
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))) {
      throw new RoomRequestError(`${field} must be an array of valid MongoDB IDs.`);
    }
    payload[field] = [...new Set(ids.map((id) => id.toLowerCase()))];
  }

  if (Object.hasOwn(body, "fundBalance")) {
    if (typeof body.fundBalance !== "number" || !Number.isFinite(body.fundBalance) || body.fundBalance < 0) {
      throw new RoomRequestError("fundBalance must be a non-negative number.");
    }
    payload.fundBalance = body.fundBalance;
  }

  if (!requireRoomName && Object.keys(payload).length === 0) {
    throw new RoomRequestError("Provide at least one room field to update.");
  }

  return payload;
}

function isValidRoomId(roomId) {
  return mongoose.isValidObjectId(roomId);
}

function handleRoomError(res, error) {
  if (error instanceof RoomRequestError) {
    return res.status(400).json({ message: error.message });
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }

  console.error("Room request failed:", error);
  return res.status(500).json({ message: "Unable to process room request." });
}

export async function getRooms(_req, res) {
  try {
    const rooms = await Room.find().sort({ createDate: -1, _id: -1 }).lean();
    return res.status(200).json({ rooms });
  } catch (error) {
    return handleRoomError(res, error);
  }
}

export async function getRoomById(req, res) {
  if (!isValidRoomId(req.params.roomId)) {
    return res.status(400).json({ message: "Invalid room ID." });
  }

  try {
    const room = await Room.findById(req.params.roomId).lean();
    if (!room) return res.status(404).json({ message: "Room not found." });
    return res.status(200).json({ room });
  } catch (error) {
    return handleRoomError(res, error);
  }
}

export async function createRoom(req, res) {
  try {
    const payload = parseRoomPayload(req.body, { requireRoomName: true });
    const room = await Room.create(payload);
    return res.status(201).json({ message: "Room created.", room });
  } catch (error) {
    return handleRoomError(res, error);
  }
}

export async function updateRoom(req, res) {
  if (!isValidRoomId(req.params.roomId)) {
    return res.status(400).json({ message: "Invalid room ID." });
  }

  try {
    const payload = parseRoomPayload(req.body);
    const room = await Room.findByIdAndUpdate(req.params.roomId, payload, {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ message: "Room not found." });
    return res.status(200).json({ message: "Room updated.", room });
  } catch (error) {
    return handleRoomError(res, error);
  }
}

export async function deleteRoom(req, res) {
  if (!isValidRoomId(req.params.roomId)) {
    return res.status(400).json({ message: "Invalid room ID." });
  }

  try {
    const room = await Room.findByIdAndDelete(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });
    return res.status(200).json({ message: "Room deleted.", roomId: room.id });
  } catch (error) {
    return handleRoomError(res, error);
  }
}
