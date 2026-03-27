const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        sku: {
            type: String,
            default: "",
            trim: true,
        },

        category: {
            type: String,
            default: "",
            trim: true,
        },

        productType: {
            type: String,
            default: "",
            trim: true,
        },

        karat: {
            type: String,
            default: "",
            trim: true,
        },

        quantity: {
            type: Number,
            alias: "qty",
            default: 0,
            min: 0,
        },

        totalWeight: {
            type: Number,
            alias: "grams",
            default: 0,
            min: 0,
        },

        markupPerGram: {
            type: Number,
            default: 0,
            min: 0,
        },

        baseCostPerGram: {
            type: Number,
            alias: "costPrice",
            default: 0,
            min: 0,
        },

        notes: {
            type: String,
            default: "",
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

module.exports = mongoose.model("Product", productSchema);
