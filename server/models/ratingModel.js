import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true
        },

        rating: {
            type: Number,
            required: true,
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
            validate: {
                validator: Number.isInteger,
                message: "Rating must be a whole number"
            }
        },

        review: {
            type: String,
            trim: true,
            maxlength: [
                1000,
                "Review cannot exceed 1000 characters"
            ],
            default: ""
        },

        verifiedPurchase: {
            type: Boolean,
            default: false,
            immutable: true
        }
    },
    {
        timestamps: true
    }
);


// One review per customer per product
ratingSchema.index(
    { user: 1, product: 1 },
    { unique: true }
);

// Efficient retrieval of reviews for a product
ratingSchema.index(
    { product: 1, createdAt: -1 }
);


const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;