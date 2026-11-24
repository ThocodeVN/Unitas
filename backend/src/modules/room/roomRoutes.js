import { Router } from "express";
import {
  getMyRoom,
  getDashboardSummary,
  createRoom,
  joinRoom,
  cancelJoin,
  leaveRoom,
  approveMember,
  rejectMember,
  transferTreasurer,
} from "./roomController.js";

const roomRouter = Router();

roomRouter.get("/me", getMyRoom);
roomRouter.get("/dashboard", getDashboardSummary);
roomRouter.post("/", createRoom);
roomRouter.post("/join", joinRoom);
roomRouter.delete("/join", cancelJoin);
roomRouter.post("/leave", leaveRoom);
roomRouter.post("/:roomId/requests/:userId/approve", approveMember);
roomRouter.post("/:roomId/requests/:userId/reject", rejectMember);
roomRouter.patch("/:roomId/treasurer", transferTreasurer);

export default roomRouter;
