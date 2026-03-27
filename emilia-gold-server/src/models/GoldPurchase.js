const mongoose = require("mongoose");

const goldPurchaseSchema = new mongoose.Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },

        ref: {
            type: String,
            required: true,
            trim: true,
        },

        date: {
            type: Date,
            default: Date.now,
        },

        karat: {
            type: String,
            default: "",
            trim: true,
        },

        weight: {
            type: Number,
            required: true,
            min: 0.0001,
        },

        externalReferenceBuyPricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        purchasePricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        estimatedResaleValue: {
            type: Number,
            required: true,
            min: 0,
        },

        totalPurchaseAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        expectedMargin: {
            type: Number,
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: ["Cash", "Card", "Transfer", "Other"],
            default: "Cash",
        },

        notes: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

goldPurchaseSchema.pre("validate", function (next) {
    if (!this.ref) {
        this.ref = `GB-${Date.now().toString().slice(-6)}`;
    }
    next();
});

module.exports = mongoose.model("GoldPurchase", goldPurchaseSchema);