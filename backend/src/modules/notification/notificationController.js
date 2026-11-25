import mongoose from "mongoose";
import Notification from "./notificationModel.js";

const toDto = (n) => ({
  _id: n._id,
  type: n.type,
  message: n.message,
  link: n.link,
  read: n.read,
  createdAt: n.createdAt,
  actor: n.actor
    ? { _id: n.actor._id, fullName: n.actor.fullName, avatar: n.actor.avatar || "" }
    : null,
});

// GET /api/notifications?limit=20 -> { notifications, unread }
export async function listNotifications(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const [list, unread] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", "fullName avatar"),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  return res.json({ notifications: list.map(toDto), unread });
}

// POST /api/notifications/read-all -> { unread: 0 }
export async function readAll(req, res) {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } },
  );
  return res.json({ unread: 0 });
}

// PATCH /api/notifications/:id/read -> { unread }
export async function readOne(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Mã không hợp lệ" });
  }
  await Notification.updateOne(
    { _id: id, user: req.user._id },
    { $set: { read: true } },
  );
  const unread = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });
  return res.json({ unread });
}
