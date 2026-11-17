
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExpenseCategory",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    description: {
        type: String
    },

    dateCreate: {
        type: Date,
        default: Date.now
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

export default Transaction;
