import mongoose from "mongoose";
import processOrderRefund from "../services/refundService.js";
import Order from "../models/orderModel.js";


const processRefund = async (req, res) => {

    const { oid } = req.params;

    // 1. Validate Order ID
    if (!mongoose.isValidObjectId(oid)) {
        res.status(400);
        throw new Error("Invalid Order ID!");
    }

    // 2. Process refund using shared service
    const result = await processOrderRefund(oid);

    const { order, payment } = result;

    // 3. Return refund details
    return res.status(200).json({
        success: true,
        message: "Mock refund processed successfully!",

        refund: {
            refundId: order.refundId,
            orderId: order._id,
            orderNumber: order.orderNumber,
            refundedAmount: order.refundedAmount,
            refundStatus: order.refundStatus,
            refundedAt: order.refundedAt
        },

        payment: {
            paymentId: payment._id,
            checkoutId: payment.checkoutId,
            amountPaise: payment.amountPaise,
            refundedAmountPaise: payment.refundedAmountPaise,
            currency: payment.currency,
            status: payment.status
        }
    });
};

const getPendingRefunds = async (req, res) => {

    // 1. Read pagination parameters
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    // 2. Validate pagination
    if (!Number.isInteger(page) || page < 1) {
        res.status(400);
        throw new Error("Invalid page number!");
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        res.status(400);
        throw new Error("Limit must be between 1 and 50!");
    }

    // 3. Find eligible pending refunds
    const filter = {
        orderStatus: "cancelled",
        paymentMethod: "online",
        paymentStatus: "paid",
        refundStatus: "pending"
    };

    // 4. Fetch orders and total count
    const [orders, totalOrders] = await Promise.all([

        Order.find(filter)
            .populate("user", "name email phone")
            .populate("vendor", "businessName email phone")
            .sort({ cancelledAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit),

        Order.countDocuments(filter)

    ]);

    // 5. Return results
  return res.status(200).json({
    success: true,

    message: totalOrders === 0
        ? "No pending refunds found."
        : "Pending refunds fetched successfully.",

    pagination: {
        page,
        limit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit)
    },

    count: orders.length,
    orders
});
};


const getRefundHistory = async (req, res) => {

    // 1. Read pagination parameters
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    // 2. Validate pagination
    if (!Number.isInteger(page) || page < 1) {
        res.status(400);
        throw new Error("Invalid page number!");
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        res.status(400);
        throw new Error("Limit must be between 1 and 50!");
    }

    // 3. Find completed refund attempts
    const filter = {
        orderStatus: "cancelled",
        paymentMethod: "online",
        refundStatus: {
            $in: ["processed", "failed"]
        }
    };

    // 4. Fetch refund history and total count
    const [orders, totalOrders] = await Promise.all([

        Order.find(filter)
            .populate("user", "name email phone")
            .populate("vendor", "businessName email phone")
            .sort({ refundedAt: -1, updatedAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit),

        Order.countDocuments(filter)

    ]);

    // 5. Return results
    return res.status(200).json({
        success: true,

        message: totalOrders === 0
            ? "No refund history found."
            : "Refund history fetched successfully.",

        pagination: {
            page,
            limit,
            totalOrders,
            totalPages: Math.ceil(totalOrders / limit)
        },

        count: orders.length,
        orders
    });
};

const refundController = {
    processRefund ,getPendingRefunds , getRefundHistory
};

export default refundController;