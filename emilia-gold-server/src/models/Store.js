const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    currency: {
      type: String,
      default: "ILS",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    settings: {
      currency: {
        type: String,
        default: "ILS",
      },
      defaultKarat: {
        type: String,
        default: "24K",
      },
      defaultMarkupPerGram: {
        type: Number,
        default: 0,
      },
      lowStockLimit: {
        type: Number,
        default: 2,
      },
      minimumProfitPerGram: {
        type: Number,
        default: 0,
      },
      businessName: {
        type: String,
        default: "",
      },
      receiptFooter: {
        type: String,
        default: "",
      },
      notes: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Store", storeSchema);