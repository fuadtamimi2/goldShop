const mongoose = require("mongoose");

const dailyPricingSchema = new mongoose.Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: true,
        },

        // "YYYY-MM-DD" string — one record per store per day
        pricingDate: {
            type: String,
            required: true,
            trim: true,
        },

        // USD per troy ounce — snapshot from API or manually entered
        globalGoldPricePerOunce: {
            type: Number,
            required: true,
            min: 0,
        },

        // Additional offset applied when computing the buy base price
        buyOffsetPerOunce: {
            type: Number,
            required: true,
            default: 0,
        },

        // Additional offset applied when computing the sell base price
        sellOffsetPerOunce: {
            type: Number,
            required: true,
            default: 0,
        },

        // Manually entered each morning — reflects the rate the business uses
        usdIlsExchangeRate: {
            type: Number,
            required: true,
            min: 0,
        },

        snapshotTimestamp: {
            type: Date,
            default: Date.now,
        },

        // e.g. "manual", "goldapi.io"
        sourceLabel: {
            type: String,
            default: "manual",
            trim: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

// Enforce one pricing record per store per day
dailyPricingSchema.index({ storeId: 1, pricingDate: 1 }, { unique: true });

module.exports = mongoose.model("DailyPricing", dailyPricingSchema);
