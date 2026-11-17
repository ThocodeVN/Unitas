import { Router } from "express";
import {
  createRoom,
  deleteRoom,
  getRoomById,
  getRooms,
  updateRoom,
} from "./roomController.js";

const roomRouter = Router();

roomRouter.route("/").get(getRooms).post(createRoom);
roomRouter.route("/:roomId").get(getRoomById).put(updateRoom).patch(updateRoom).delete(deleteRoom);

export default roomRouter;
