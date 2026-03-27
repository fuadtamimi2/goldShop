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

        baseGoldPricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        markupPerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        extraProfitPerGram: {
            type: Number,
            default: 0,
        },

        minimumPricePerGram: {
            type: Number,
            required: true,
            min: 0,
        },

        finalPricePerGram: {
            type: Number,
            alias: "pricePerGram",
            required: true,
            min: 0,
        },

        baseValue: {
            type: Number,
            required: true,
            min: 0,
        },

        markupValue: {
            type: Number,
            required: true,
            min: 0,
        },

        profitValue: {
            type: Number,
            required: true,
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
            required: true,
            min: 0,
        },

        totalMarkupValue: {
            type: Number,
            required: true,
            min: 0,
        },

        totalProfitValue: {
            type: Number,
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        expectedMargin: {
            type: Number,
            required: true,
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
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Auto-generate ref if not provided (TX-<timestamp suffix>)
saleSchema.pre("validate", function (next) {
    if (!this.ref) {
        this.ref = `TX-${Date.now().toString().slice(-5)}`;
    }
    next();
});

module.exports = mongoose.model("Sale", saleSchema);
