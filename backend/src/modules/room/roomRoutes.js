import { Router } from "express";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getMyRoom,
  getRoomById,
  updateRoom,
  transferTreasurer,
  deleteRoom,
} from "./roomController.js";

const roomRouter = Router();

// Các đường dẫn cố định phải đặt trước /:roomId
roomRouter.post("/", createRoom);
roomRouter.post("/join", joinRoom);
roomRouter.post("/leave", leaveRoom);
roomRouter.get("/me", getMyRoom);

roomRouter
  .route("/:roomId")
  .get(getRoomById)
  .put(updateRoom)
  .patch(updateRoom)
  .delete(deleteRoom);
roomRouter.patch("/:roomId/treasurer", transferTreasurer);

export default roomRouter;
