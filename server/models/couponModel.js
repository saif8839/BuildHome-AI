import mongoose from "mongoose";


const couponSchema = new mongoose.Schema(
    {
        vendor : {
            type : mongoose.Schema.Types.ObjectId,
            required : true,
            ref : "Vendor"
        },
       
        couponCode: {
            type: String,
            required: [true, "Please enter a coupon code."],
            trim: true,
            uppercase: true,
            minlength: [3, "Coupon code must have at least 3 characters."],
            maxlength: [20, "Coupon code cannot exceed 20 characters."]
        },
        couponDiscount : {
            type : Number,
            required : [true , "please Enter the Discount percentage or amount "],
            min : [0 , "Discount Can not be Negative!!!"],
            validate : {
                validator : Number.isFinite,
                message : "Enter valid Coupon Discount Value"
            }
        },

           discountType: {
            type: String,
            enum: ["percentage", "fixed"],
            required: true
        },

        isActive : {
            type : Boolean,
            default : true,
            required : true
        },
            
        expiresAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps : true
    }
)

// Each vendor can have a coupon code once.
couponSchema.index(
    { vendor: 1, couponCode: 1 },
    { unique: true }
);

couponSchema.path("couponDiscount").validate(function (value) {
    if (this.discountType === "percentage") {
        return value > 0 && value <= 100;
    }

    return value > 0;
}, "Percentage must be at most 100, and discount must be greater than zero.");

const Coupon = mongoose.model("Coupon" , couponSchema)

export default Coupon