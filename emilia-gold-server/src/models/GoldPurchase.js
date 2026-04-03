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

        marketPricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        boughtPricePerGram: {
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

        expectedRevenue: {
            type: Number,
            required: true,
        },

        // Legacy fields kept for backward compatibility.
        externalReferenceBuyPricePerGram: {
            type: Number,
            default: 0,
            min: 0,
        },

        purchasePricePerGram: {
            type: Number,
            default: 0,
            min: 0,
        },

        expectedMargin: {
            type: Number,
            default: 0,
        },

        // ── Daily pricing snapshot fields ──────────────────────────────────────
        globalGoldPricePerOunceSnapshot: { type: Number, default: 0 },
        buyOffsetPerOunceSnapshot: { type: Number, default: 0 },
        usdIlsExchangeRateSnapshot: { type: Number, default: 0 },
        buyBasePricePerGramSnapshot: { type: Number, default: 0 },
        revenueSnapshot: { type: Number, default: 0 },
        dailyPricingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DailyPricing",
            default: null,
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

goldPurchaseSchema.pre("validate", function () {
    if (!this.ref) {
        this.ref = `GB-${Date.now().toString().slice(-6)}`;
    }
});

module.exports = mongoose.model("GoldPurchase", goldPurchaseSchema);