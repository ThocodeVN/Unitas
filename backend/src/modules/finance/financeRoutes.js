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

const router = Router();

router.get("/fund", getFund);
router.get("/contributions", listContributions);
router.post("/contributions", createContribution);
router.delete("/contributions/:id", deleteContribution);
router.post("/contributions/:id/payments/:userId/confirm", confirmPayment);

router.get("/expenses", listExpenses);
router.post("/expenses", createExpense);
router.delete("/expenses/:id", deleteExpense);

export default router;
