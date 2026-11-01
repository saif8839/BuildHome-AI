import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true
        },
        productName: {
            type: String,
            required: true,
            trim: true
        },
        unit: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity Must Be Atleast One...."],
            validate: {
                validator: Number.isSafeInteger,
                message: "Quantity Must Be a While Number"
            }
        },
        unitPrice: {
            type: Number,
            required: true,
            min: [0, "Unit Price Can Not Be Negative!!!"],
            validate: {
                validator: Number.isFinite,
                message: "Unit Price must Be Finite"
            }
        },
        subTotal: {
            type: Number,
            required: true,
            min: [0, "Subtotal cannot be negative"],
            validate: {
                validator: Number.isFinite,
                message: "Subtotal must be finite",
            }
        }
    },
    {
        _id: false
    }
)

const appliedCouponSchema = new mongoose.Schema({
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null
    },
    couponCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true
    },
    discountAmount: {
        type: Number,
        required: true,
        min: 0
    },
    eligibleSubtotal: {
        type: Number,
        required: true,
        min: 0
    }
},
    {
        _id: false
    }
)

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            index: true,
            ref: "User",
            immutable: true,
            required: true
        },
        checkoutId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
            immutable: true
        },
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            immutable: true
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true
        },
        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: items => Array.isArray(items) && items.length > 0,
                message: "An Order Must Contain Atleast One Item"
            }
        },

        appliedCoupon: {
            type: appliedCouponSchema,
            default: null
        },
        shippingAddress: {
            recipientName: {
                type: String,
                required: true,
                trim: true
            },
            email: {
                type: String,
                required: [true, "Please Enter Email"],
                trim: true,
                lowercase: true
            },
            phone: {
                type: String,
                required: true,
                trim: true
            },
            street: {
                type: String,
                required: true,
                trim: true,
            },
            city: {
                type: String,
                required: true,
                trim: true,
            },
            state: {
                type: String,
                required: true,
                trim: true,
            },
            pincode: {
                type: String,
                required: true,
                trim: true,
            },
            country: {
                type: String,
                required: true,
                trim: true,
                default: "India"
            }
        },

        itemsTotal: {
            type: Number,
            required: true,
            min: [0, "item Total Can Not Be Negative"]
        },
        discountTotal: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "Discount Total Can Not Be Negative"]
        },
        deliveryCharge: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        taxTotal: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: [0, "Total Amount Can Not Be Negative"]
        },
        paymentMethod: {
            type: String,
            enum: ["online", "cod"],
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "partially_refunded", "refunded"],
            default: "pending",
            required: true
        },
        orderStatus: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
            ],
            default: "pending",
            required: true
        }
    },
    {
        timestamps: true
    }
)

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema)

export default Order 