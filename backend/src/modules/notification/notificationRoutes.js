import { Router } from "express";
import {
  listNotifications,
  readAll,
  readOne,
} from "./notificationController.js";

const router = Router();

router.get("/", listNotifications);
router.post("/read-all", readAll);
router.patch("/:id/read", readOne);

export default router;
