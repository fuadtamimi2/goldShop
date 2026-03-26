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

        // Weight in grams
        grams: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Current stock quantity
        qty: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Cost price in ILS
        costPrice: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Selling price in ILS
        sellingPrice: {
            type: Number,
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
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
