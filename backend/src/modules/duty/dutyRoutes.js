import { Router } from "express";
import {
  listDuties,
  createDuty,
  createRotation,
  updateDuty,
  updateDutyStatus,
  deleteDuty,
} from "./dutyController.js";

const router = Router();

router.get("/", listDuties);
router.post("/", createDuty);
router.post("/rotation", createRotation);
router.patch("/:id", updateDuty);
router.patch("/:id/status", updateDutyStatus);
router.delete("/:id", deleteDuty);

export default router;
