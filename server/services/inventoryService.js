import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import Product from "../models/productModel.js";

const releaseExpiredCheckout = async (checkoutId) => {
    const session = await mongoose.startSession();
    const now = new Date();

    try {
        const released = await session.withTransaction(async () => {

            // Fetch only orders eligible for expiry
            const eligibleOrders = await Order.find({
                checkoutId,
                paymentMethod: "online",
                paymentStatus: "pending",
                orderStatus: "pending",
                inventoryStatus: "reserved",
                reservationExpiresAt: { $lte: now }
            }).session(session);

            if (eligibleOrders.length === 0) {
                return false;
            }

            // Collect the quantity to restore for each product
            const stockRestore = new Map();

            for (const order of eligibleOrders) {
                for (const item of order.items) {
                    const productId = item.product.toString();

                    const currentQuantity = stockRestore.get(productId) || 0;

                    stockRestore.set(
                        productId,
                        currentQuantity + item.quantity
                    );
                }
            }

            // Mark eligible orders as cancelled and inventory released
            const orderUpdateResult = await Order.updateMany(
                {
                    _id: { $in: eligibleOrders.map(order => order._id) },
                    paymentMethod: "online",
                    paymentStatus: "pending",
                    orderStatus: "pending",
                    inventoryStatus: "reserved",
                    reservationExpiresAt: { $lte: now }
                },
                {
                    $set: {
                        orderStatus: "cancelled",
                        inventoryStatus: "released"
                    }
                },
                { session }
            );

            if (orderUpdateResult.modifiedCount !== eligibleOrders.length) {
                throw new Error("Could not release all eligible checkout orders!");
            }

            // Restore product stock
            for (const [productId, quantity] of stockRestore) {
                const stockUpdateResult = await Product.updateOne(
                    { _id: productId },
                    {
                        $inc: {
                            stock: quantity
                        }
                    },
                    { session }
                );

                if (stockUpdateResult.matchedCount !== 1) {
                    throw new Error(
                        `Product not found while restoring stock: ${productId}`
                    );
                }
            }

            // Expire existing payment attempts because checkout amount changed
            await Payment.updateMany(
                {
                    checkoutId,
                    status: "created"
                },
                {
                    $set: {
                        status: "expired"
                    }
                },
                { session }
            );

            return true;
        });

        return released;

    } finally {
        await session.endSession();
    }
};

export default releaseExpiredCheckout;