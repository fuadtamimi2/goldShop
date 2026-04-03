const mongoose = require("mongoose");

// A line item within a sale
const saleItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null,
        },

        productName: {
            type: String,
            required: true,
            trim: true,
        },

        // Legacy field kept for backward compatibility
        description: {
            type: String,
            default: "",
            trim: true,
        },

        quantitySold: {
            type: Number,
            alias: "qty",
            required: true,
            min: 1,
        },

        soldWeight: {
            type: Number,
            alias: "grams",
            required: true,
            min: 0.0001,
        },

        minimumPricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        productExtraProfitPerGram: {
            type: Number,
            default: 0,
            min: 0,
        },

        expectedMinimumSellingPricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        actualSalePricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        lineRevenue: {
            type: Number,
            required: true,
        },

        // Legacy fields kept for old records and payload compatibility.
        baseGoldPricePerGram: {
            type: Number,
            default: 0,
            min: 0,
        },

        markupPerGram: {
            type: Number,
            default: 0,
            min: 0,
        },

        extraProfitPerGram: {
            type: Number,
            default: 0,
        },

        finalPricePerGram: {
            type: Number,
            alias: "pricePerGram",
            default: 0,
            min: 0,
        },

        baseValue: {
            type: Number,
            default: 0,
            min: 0,
        },

        markupValue: {
            type: Number,
            default: 0,
            min: 0,
        },

        profitValue: {
            type: Number,
            default: 0,
        },

        lineTotal: {
            type: Number,
            required: true,
            min: 0,
        },

        isBelowMinimum: {
            type: Boolean,
            default: false,
        },

        // ── Daily pricing snapshot fields (added for historical accuracy) ──
        // These ensure old records are never recalculated if daily prices change.
        globalGoldPricePerOunceSnapshot: { type: Number, default: 0 },
        sellOffsetPerOunceSnapshot: { type: Number, default: 0 },
        usdIlsExchangeRateSnapshot: { type: Number, default: 0 },
        sellBasePricePerGramSnapshot: { type: Number, default: 0 },
        productExtraPerGramSnapshot: { type: Number, default: 0 },
        expectedProductPricePerGramSnapshot: { type: Number, default: 0 },
        profitPerGramSnapshot: { type: Number, default: 0 },
        lineProfitSnapshot: { type: Number, default: 0 },
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

        // Customer is mandatory for all sales
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
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

        totalQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        totalWeight: {
            type: Number,
            required: true,
            min: 0,
        },

        totalBaseValue: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalMarkupValue: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalProfitValue: {
            type: Number,
            default: 0,
        },

        totalLineRevenue: {
            type: Number,
            default: 0,
        },

        expectedMinimumTotal: {
            type: Number,
            default: 0,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        expectedMargin: {
            type: Number,
            default: 0,
        },

        finalTotal: {
            type: Number,
            alias: "totalILS",
            required: true,
            min: 0,
        },

        paymentMethod: {
            type: String,
            enum: ["Cash", "Card", "Transfer", "Other"],
            default: "Cash",
        },

        paymentStatus: {
            type: String,
            alias: "status",
            enum: ["Paid", "Pending", "Refunded"],
            default: "Paid",
        },

        notes: {
            type: String,
            default: "",
            trim: true,
        },

        // ── Sale-level daily pricing snapshot ─────────────────────────────────
        globalGoldPricePerOunceSnapshot: { type: Number, default: 0 },
        sellOffsetPerOunceSnapshot: { type: Number, default: 0 },
        usdIlsExchangeRateSnapshot: { type: Number, default: 0 },
        dailyPricingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DailyPricing",
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Auto-generate ref if not provided (TX-<timestamp suffix>)
saleSchema.pre("validate", function () {
    if (!this.ref) {
        this.ref = `TX-${Date.now().toString().slice(-5)}`;
    }
});

module.exports = mongoose.model("Sale", saleSchema);
