import { Router } from "express";
import {
  getFund,
  listContributions,
  createContribution,
  confirmPayment,
  deleteContribution,
} from "./financeController.js";
import {
  listExpenses,
  createExpense,
  deleteExpense,
} from "./expenseController.js";
import { getStats } from "./statsController.js";
import { getFundHistory } from "./historyController.js";
import { createTransfer } from "./transferController.js";
import {
  listAdjustments,
  createAdjustment,
  approveAdjustment,
  rejectAdjustment,
  cancelAdjustment,
} from "./adjustmentController.js";

const router = Router();

router.get("/fund", getFund);
router.get("/fund/history", getFundHistory);
router.post("/transfers", createTransfer);

router.get("/contributions", listContributions);
router.post("/contributions", createContribution);
router.delete("/contributions/:id", deleteContribution);
router.post("/contributions/:id/payments/:userId/confirm", confirmPayment);

router.get("/expenses", listExpenses);
router.post("/expenses", createExpense);
router.delete("/expenses/:id", deleteExpense);

router.get("/stats", getStats);

router.get("/adjustments", listAdjustments);
router.post("/adjustments", createAdjustment);
router.post("/adjustments/:id/approve", approveAdjustment);
router.post("/adjustments/:id/reject", rejectAdjustment);
router.delete("/adjustments/:id", cancelAdjustment);

export default router;
