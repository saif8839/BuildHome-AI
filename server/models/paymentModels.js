import mongoose from "mongoose";


const paymentSchema = new mongoose.Schema({

    checkoutId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        required: true,
        immutable: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true
    },
    provider: {
        type: String,
        enum: ["razorpay" , "mock"],
        default: "mock",
        required: true

    },
    providerOrderId: {
        type: String,
        required: true,
        unique: true
    },
    providerPaymentId: {
        type: String,
        default: null
    },
    amountPaise: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isSafeInteger,
            message: "Payment amount must be a safe integer"
        }
    },
    currency: {
        type: String,
        default: "INR",
        enum: ["INR"],
        required: true
    },
    status: {
        type: String, 
        enum: ["created", "captured", "expired", "refunded" , "failed"],
        default: "created",
        required: true
    },
    capturedAt: {
        type: Date,
        default: null
    },
},
    {
        timestamps: true
    }
)

paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema)


export default Payment 