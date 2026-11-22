import mongoose from "mongoose"
import Order from "../models/orderModel.js"
import Product from "../models/productModel.js"
import Rating from "../models/ratingModel.js"


const createReview = async (req, res) => {
    const userId = req.user._id
    const { rating, review = "" } = req.body
    const productId = req.params.pid

    // 1. Only customers can submit reviews
    if (req.user.role !== "user") {
        res.status(403);
        throw new Error("Only customers can submit reviews");
    }

    if (!mongoose.isValidObjectId(productId)) {
        res.status(400)
        throw new Error("Invalid Product ID")
    }

    const ratingValue = Number(rating);

    if (!Number.isInteger(ratingValue) || ratingValue > 5 || ratingValue < 1) {
        res.status(400);
        throw new Error("Rating must be an integer between 1 and 5");
    }
    // 4. Validate review text
    if (typeof review !== "string") {
        res.status(400);
        throw new Error("Review must be a string");
    }

    const reviewText = review.trim();

    if (reviewText.length > 1000) {
        res.status(400);
        throw new Error("Review cannot exceed 1000 characters");
    }
    const session = await mongoose.startSession();

    let newReview;

    try {
        await session.withTransaction(async () => {

            // 1. Check whether product exists
            const productExist = await Product.findById(productId)
                .select("_id")
                .session(session);

            if (!productExist) {
                res.status(404);
                throw new Error("Product not found");
            }

            // 2. Verify delivered purchase
            const deliveredOrder = await Order.findOne({
                user: userId,
                "items.product": productId,
                orderStatus: "delivered",
                paymentStatus: "paid"
            }).select("_id").session(session);

            if (!deliveredOrder) {
                res.status(403);
                throw new Error("You can review a product only after receiving it");
            }

            // 3. Check for an existing review
            const existingReview = await Rating.findOne({
                user: userId,
                product: productId
            }).session(session);

            if (existingReview) {
                res.status(409);
                throw new Error("You have already reviewed this product");
            }

            // 4. Create review
            newReview = new Rating({
                user: userId,
                product: productId,
                order: deliveredOrder._id,
                rating: ratingValue,
                review: reviewText,
                verifiedPurchase: true
            });

            await newReview.save({ session });

            // 5. Calculate rating statistics
            const stats = await Rating.aggregate([
                {
                    $match: {
                        product: new mongoose.Types.ObjectId(productId)
                    }
                },
                {
                    $group: {
                        _id: "$product",
                        averageRating: { $avg: "$rating" },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]).session(session);

            if (!stats.length) {
                throw new Error("Unable to calculate rating statistics");
            }

            const { averageRating, totalReviews } = stats[0];

            // 6. Update Product rating summary
            await Product.findByIdAndUpdate(
                productId,
                {
                    $set: {
                        ratingAverage: Number(averageRating.toFixed(2)),
                        ratingCount: totalReviews
                    }
                },
                {
                    new: true,
                    runValidators: true,
                    session
                }
            );

        });

        // Transaction committed successfully
        res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review: newReview
        });

    } catch (error) {

        // Handle duplicate review caused by simultaneous requests
        if (error.code === 11000) {
            res.status(409);
            throw new Error("You have already reviewed this product");
        }

        throw error;

    } finally {
        await session.endSession();
    }
}

const getProductReviews = async (req, res) => {
    const productId = req.params.pid;

    // 1. Validate Product ID
    if (!mongoose.isValidObjectId(productId)) {
        res.status(400);
        throw new Error("Invalid Product ID");
    }

    // 2. Check whether product exists
    const productExist = await Product.findById(productId).select("_id");

    if (!productExist) {
        res.status(404);
        throw new Error("Product not found");
    }

    // 3. Get pagination values
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
        res.status(400);
        throw new Error("Invalid pagination values");
    }

    // 1. Calculate how many reviews to skip
    const skip = (page - 1) * limit;

    // 2. Fetch reviews and total review count simultaneously
    const [reviews, totalReviews] = await Promise.all([

        Rating.find({ product: productId })
            .populate("user", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Rating.countDocuments({ product: productId })
    ]);

    // 3. Calculate total pages
    const totalPages = Math.ceil(totalReviews / limit);

    // 4. Send response
    res.status(200).json({
        success: true,
        reviews,
        pagination: {
            currentPage: page,
            limit,
            totalReviews,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    });

};

const updateReview = async (req, res) => {
    const userId = req.user._id;
    const productId = req.params.pid;
    const { rating, review } = req.body;

    if (req.user.role !== "user") {
        res.status(403);
        throw new Error("Only customers can update reviews");
    }

    // Validate product ID
    if (!mongoose.isValidObjectId(productId)) {
        res.status(400);
        throw new Error("Invalid Product ID");
    }

    // At least one field must be provided
    if (rating === undefined && review === undefined) {
        res.status(400);
        throw new Error("Please provide a rating or review to update");
    }

    // Validate rating if provided
    let ratingValue;

    if (rating !== undefined) {

        if (typeof rating !== "string" && typeof rating !== "number") {
            res.status(400);
            throw new Error("Rating must be a number");
        }

        if (typeof rating === "string" && rating.trim() === "") {
            res.status(400);
            throw new Error("Rating cannot be empty");
        }

        ratingValue = Number(rating);

        if (
            !Number.isInteger(ratingValue) ||
            ratingValue < 1 ||
            ratingValue > 5
        ) {
            res.status(400);
            throw new Error("Rating must be an integer between 1 and 5");
        }
    }

    // Validate review if provided
    let reviewText;

    if (review !== undefined) {
        if (typeof review !== "string") {
            res.status(400);
            throw new Error("Review must be a string");
        }

        reviewText = review.trim();

        if (reviewText.length > 1000) {
            res.status(400);
            throw new Error("Review cannot exceed 1000 characters");
        }
    }

    const session = await mongoose.startSession();

    let updatedReview;

    try {
        await session.withTransaction(async () => {

            // 1. Find customer's existing review
            const existingReview = await Rating.findOne({
                user: userId,
                product: productId
            }).session(session);

            if (!existingReview) {
                res.status(404);
                throw new Error("Review not found");
            }

            // 2. Update only the fields provided by the customer
            if (rating !== undefined) {
                existingReview.rating = ratingValue;
            }

            if (review !== undefined) {
                existingReview.review = reviewText;
            }

            // 3. Save updated review
            await existingReview.save({ session });

            updatedReview = existingReview;

            // 4. Calculate updated rating statistics
            const stats = await Rating.aggregate([
                {
                    $match: {
                        product: new mongoose.Types.ObjectId(productId)
                    }
                },
                {
                    $group: {
                        _id: "$product",
                        averageRating: { $avg: "$rating" },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]).session(session);

            if (!stats.length) {
                throw new Error("Unable to calculate rating statistics");
            }

            const { averageRating, totalReviews } = stats[0];

            // 5. Update Product rating summary
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    $set: {
                        ratingAverage: Number(averageRating.toFixed(2)),
                        ratingCount: totalReviews
                    }
                },
                {
                    runValidators: true,
                    session
                }
            );

            if (!updatedProduct) {
                throw new Error("Failed to update product rating summary");
            }
        });

        res.status(200).json({
            success: true,
            message: "Review updated successfully",
            review: updatedReview
        });

    } finally {
        await session.endSession();
    }

}

const deleteReview = async (req, res) => {
    const userId = req.user._id;
    const productId = req.params.pid;

    // 1. Only customers can delete reviews
    if (req.user.role !== "user") {
        res.status(403);
        throw new Error("Only customers can delete reviews");
    }

    // 2. Validate Product ID
    if (!mongoose.isValidObjectId(productId)) {
        res.status(400);
        throw new Error("Invalid Product ID");
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {

            // 3. Find customer's own review
            const existingReview = await Rating.findOne({
                user: userId,
                product: productId
            }).session(session);

            if (!existingReview) {
                res.status(404);
                throw new Error("Review not found");
            }

            // 4. Delete the review
            const deleteResult = await Rating.deleteOne({
                _id: existingReview._id
            }).session(session);

            if (deleteResult.deletedCount !== 1) {
                throw new Error("Failed to delete review");
            }

            const stats = await Rating.aggregate([
                {
                    $match: {
                        product: new mongoose.Types.ObjectId(productId)
                    }
                },
                {
                    $group: {
                        _id: "$product",
                        averageRating: { $avg: "$rating" },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]).session(session);

            const averageRating = stats.length
                ? Number(stats[0].averageRating.toFixed(2))
                : 0;

            const totalReviews = stats.length
                ? stats[0].totalReviews
                : 0;

            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    $set: {
                        ratingAverage: averageRating,
                        ratingCount: totalReviews
                    }
                },
                {
                    runValidators: true,
                    session
                }
            );

            if (!updatedProduct) {
                throw new Error("Failed to update product rating summary");
            }

        });

        res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        });

    } finally {
        await session.endSession();
    }
};


const ratingController = { createReview, getProductReviews, updateReview, deleteReview }


export default ratingController