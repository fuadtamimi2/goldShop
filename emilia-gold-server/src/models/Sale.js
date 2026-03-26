const mongoose = require("mongoose");

// A line item within a sale
const saleItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        grams: {
            type: Number,
            default: 0,
            min: 0,
        },
        qty: {
            type: Number,
            default: 1,
            min: 1,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const saleSchema = new mongoose.Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: true,
        },

        // Seller who processed this sale
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Optional linked customer
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },

        // Human-readable transaction reference (e.g. TX-10601)
        ref: {
            type: String,
            required: true,
            trim: true,
        },

        date: {
            type: Date,
            default: Date.now,
        },

        items: {
            type: [saleItemSchema],
            default: [],
        },

        // Total amount in ILS (authoritative currency)
        totalILS: {
            type: Number,
            required: true,
            min: 0,
        },

        paymentMethod: {
            type: String,
            enum: ["Cash", "Card", "Transfer", "Other"],
            default: "Cash",
        },

        status: {
            type: String,
            enum: ["Paid", "Pending", "Refunded"],
            default: "Paid",
        },

        notes: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

// Auto-generate ref if not provided (TX-<timestamp suffix>)
saleSchema.pre("validate", function (next) {
    if (!this.ref) {
        this.ref = `TX-${Date.now().toString().slice(-5)}`;
    }
    next();
});

module.exports = mongoose.model("Sale", saleSchema);
