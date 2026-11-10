    import mongoose from "mongoose";
    import Order from "../models/orderModel.js";
    import Payment from "../models/paymentModel.js";
    import Product from "../models/productModel.js";




    const releaseExpiredCheckout = async (checkoutId) => {
        const session = await mongoose.startSession()
        const now = new Date()

        try {

            const released = await session.withTransaction(async () => {

                const orders = await Order.find({ checkoutId }).session(session)

                if (orders.length === 0) {
                    return false
                }

                const canRelease = orders.every((order) =>

                    order.paymentMethod === "online" &&
                    order.paymentStatus === "pending" &&
                    order.orderStatus === "pending" &&
                    order.inventoryStatus === "reserved" &&
                    order.reservationExpiresAt &&
                    order.reservationExpiresAt <= now
                )

                if (!canRelease) {
                    return false
                }

                // Collect the quantity to restore for each product

                const stockRestore = new Map()

                for (const order of orders) {
                    for (const item of order.items) {
                        const productId = item.product.toString()

                        const currentQuantity = stockRestore.get(productId) || 0

                        stockRestore.set(
                            productId,
                            currentQuantity + item.quantity
                        )
                    }
                }

                // Mark all orders as cancelled and inventory released

                const orderUpdateResult = await Order.updateMany(
                    {
                        checkoutId,
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

                if (orderUpdateResult.modifiedCount !== orders.length) {
                    throw new Error("Could not release all checkout orders!");
                }


                for (const [productId, quantity] of stockRestore) {
                    const stockUpdateResult = await Product.updateOne({ _id: productId },
                        {
                            $inc: {
                                stock: quantity
                            }
                        },
                        { session }
                    )

                    // if Product Disabled
                    if (stockUpdateResult.matchedCount !== 1) {
                        throw new Error(
                            `Product not found while restoring stock: ${productId}`
                        );
                    }
                }

                // Expire any payment attempts still awaiting completion
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

        }
        finally {
            await session.endSession();
        }

    }


    export default releaseExpiredCheckout;