import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import Product from "../models/productModel.js";


const cancelOrders = async ({ orderIds, checkoutId, actor, reason }) => {

    const hasOrderIds = orderIds !== undefined;
    const hasCheckoutId = checkoutId !== undefined;

    if (hasOrderIds === hasCheckoutId) {
        throw new Error(
            "Provide either orderIds or checkoutId, not both!"
        );
    }

    if (!actor || !["customer", "vendor", "admin"].includes(actor.type) || !mongoose.isValidObjectId(actor.id)) {
        throw new Error("Invalid cancellation actor!");
    }

    if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
        throw new Error("Please provide a valid cancellation reason!");
    }

    let selectedOrderIds = [];

    if (hasOrderIds) {

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            throw new Error("Please provide at least one Order ID!");
        }

        if (!orderIds.every(id => mongoose.isValidObjectId(id))) {
            throw new Error("One or more Order IDs are invalid!");
        }

        selectedOrderIds = [...new Set(orderIds.map(id => id.toString()))];

        if (selectedOrderIds.length !== orderIds.length) {
            throw new Error("Duplicate Order IDs are not allowed!");
        }
    }
    else {

        if (!mongoose.isValidObjectId(checkoutId)) {
            throw new Error("Invalid checkout ID!");
        }

    }

    const filter = {};

    // Select specific Orders or an entire checkout
    if (hasOrderIds) {

        filter._id = {
            $in: selectedOrderIds
        };

    } else {

        filter.checkoutId = checkoutId;

        // Ignore Orders already cancelled
        filter.orderStatus = {
            $ne: "cancelled"
        };
    }

    // Customer can only cancel their own Orders
    if (actor.type === "customer") {
        filter.user = actor.id;
    }

    // Vendor can only cancel their own Orders
    else if (actor.type === "vendor") {

        if (hasCheckoutId) {
            throw new Error(
                "Vendors can only cancel their selected Orders!"
            );
        }

        filter.vendor = actor.id;
    }

    const session = await mongoose.startSession();

    let selectedOrders = [];

    const cancelledAt = new Date();

    try {

        const cancelledOrders = await session.withTransaction(async () => {

            selectedOrders = await Order.find(filter).session(session);

            // Check whether any Orders were found
            if (selectedOrders.length === 0) {
                throw new Error(
                    "No matching Orders found or you are not authorized!"
                );
            }

            // Check whether every requested Order was found
            if (hasOrderIds && selectedOrders.length !== selectedOrderIds.length) {
                throw new Error(
                    "One or more Orders were not found or are not accessible!"
                );
            }

            // All selected Orders must belong to the same checkout
            const checkoutIds = new Set(
                selectedOrders.map(
                    order => order.checkoutId.toString()
                )
            );

            if (checkoutIds.size !== 1) {
                throw new Error(
                    "Selected Orders must belong to the same checkout!"
                );
            }


            const cancellableStatuses = [
                "pending",
                "confirmed",
                "processing"
            ];

            for (const order of selectedOrders) {

                // 1. Check Order status
                if (!cancellableStatuses.includes(order.orderStatus)) {
                    throw new Error(
                        `Order ${order.orderNumber} cannot be cancelled at ${order.orderStatus} stage!`
                    );
                }

                // 2. Check inventory status
                if (!["reserved", "committed"].includes(order.inventoryStatus)) {
                    throw new Error(
                        `Order ${order.orderNumber} has invalid inventory status!`
                    );
                }

                // 3. Check existing refund status
                if (order.refundStatus !== "not_required") {
                    throw new Error(
                        `Order ${order.orderNumber} already has a refund process!`
                    );
                }

                // 4. Validate online payment Orders
                if (order.paymentMethod === "online") {

                    if (order.paymentStatus === "pending") {

                        if (order.inventoryStatus !== "reserved") {
                            throw new Error(
                                "Unpaid online Order must have reserved inventory!"
                            );
                        }

                    }

                    else if (order.paymentStatus === "paid") {

                        if (order.inventoryStatus !== "committed") {
                            throw new Error(
                                "Paid online Order must have committed inventory!"
                            );
                        }

                    }

                    else {
                        throw new Error(
                            `Online Order cannot be cancelled with payment status: ${order.paymentStatus}`
                        );
                    }
                }

                // 5. Validate COD Orders
                else if (order.paymentMethod === "cod") {

                    if (
                        order.paymentStatus !== "pending" ||
                        order.codCollectedAt ||
                        order.codCollectedBy
                    ) {
                        throw new Error(
                            "COD Order cannot be cancelled after payment collection!"
                        );
                    }
                }

            }

            // Collect stock quantities for every selected Order

            const stockToRestore = new Map();

            for (const order of selectedOrders) {

                for (const item of order.items) {

                    const productId = item.product.toString();

                    const currentQuantity =
                        stockToRestore.get(productId) || 0;

                    stockToRestore.set(
                        productId,
                        currentQuantity + item.quantity
                    );
                }
            }

            // Mark selected Orders as cancelled

            for (const order of selectedOrders) {

                const updateResult = await Order.updateOne(
                    {
                        _id: order._id,
                        vendor: order.vendor,
                        user: order.user,
                        orderStatus: order.orderStatus,
                        paymentStatus: order.paymentStatus,
                        inventoryStatus: order.inventoryStatus,
                        refundStatus: order.refundStatus
                    },
                    {
                        $set: {
                            orderStatus: "cancelled",
                            inventoryStatus: "released",
                            reservationExpiresAt: null,
                            cancellationReason: reason.trim(),
                            cancelledBy: actor.type,
                            cancelledById: actor.id,
                            cancelledAt,

                            refundStatus:
                                order.paymentMethod === "online" &&
                                    order.paymentStatus === "paid"
                                    ? "pending"
                                    : "not_required",

                            refundedAmount: 0
                        }
                    },
                    { session }
                );

                if (updateResult.modifiedCount !== 1) {
                    throw new Error(
                        `Could not cancel Order: ${order.orderNumber}`
                    );
                }
            }


            // Restore stock for every affected Product

            for (const [productId, quantity] of stockToRestore) {

                const stockUpdateResult = await Product.updateOne(
                    {
                        _id: productId
                    },
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

            // Expire active Payment attempts for unpaid online checkout

            const hasUnpaidOnlineOrders = selectedOrders.some(
                order =>
                    order.paymentMethod === "online" &&
                    order.paymentStatus === "pending"
            );

            if (hasUnpaidOnlineOrders) {

                await Payment.updateMany(
                    {
                        checkoutId: selectedOrders[0].checkoutId,
                        user: selectedOrders[0].user,
                        status: "created"
                    },
                    {
                        $set: {
                            status: "expired"
                        }
                    },
                    { session }
                );

            }



            // Fetch the updated Orders
            const updatedOrders = await Order.find({
                _id: {
                    $in: selectedOrders.map(order => order._id)
                }
            }).session(session);

            return updatedOrders;






        });

        return cancelledOrders;


    } finally {
        await session.endSession();
    }


    // Cancellation logic will go here.

};

export default cancelOrders;