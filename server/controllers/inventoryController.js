
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import releaseExpiredCheckout from "../services/inventoryService.js";

const testReleaseExpiredCheckout = async (req, res) => {

    // Development-only endpoint
    if (process.env.NODE_ENV === "production") {
        res.status(404);
        throw new Error("This endpoint is disabled in production.");
    }

    const { checkoutId } = req.body;
    const userId = req.user._id;

    // Validate checkout ID
    if (!mongoose.isValidObjectId(checkoutId)) {
        res.status(400);
        throw new Error("Invalid checkout ID!");
    }

    // Verify that this checkout belongs to the logged-in user
    const userOrders = await Order.find({
        checkoutId,
        user: userId
    }).select("_id");

    const totalOrders = await Order.countDocuments({ checkoutId });

    if (
        userOrders.length === 0 ||
        userOrders.length !== totalOrders
    ) {
        res.status(404);
        throw new Error("Checkout not found!");
    }

    // Call inventory service
    const released = await releaseExpiredCheckout(checkoutId);

    return res.status(200).json({
        success: true,
        released,
        message: released
            ? "Inventory successfully released!"
            : "Checkout was not eligible for inventory release."
    });
};

const inventoryController = {
    testReleaseExpiredCheckout
};

export default inventoryController;