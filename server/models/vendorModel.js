import mongoose from "mongoose";



const vendorSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,
        unique : true
    },
    businessName : {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      minlength: [2, "Business name must be at least 2 characters"],
      maxlength: [100, "Business name cannot exceed 100 characters"]
    },
    phone : {
   type: String,
      required: [true, "Vendor phone is required"],
      trim: true,
      maxlength: [20, "Phone number is too long"]
    },
    email : {
        type: String,
      required: [true, "Vendor email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, "Email address is too long"]
    },
    address: {
       street: {
        type: String,
        required: [true, "Street address is required"],
        trim: true
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true
      },
      pincode: {
        type: String,
        required: [true, "Pincode is required"],
        trim: true
      },
      country: {
        type: String,
        default: "India",
        trim: true
      }
    },
    category : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "Category"
    }],
    status : {
        type : String,
        required : true,
        enum : ["active" , "pending" , "suspended"  , "rejected"],
        default : "pending"
    },
    isActive : 
    {
        type : Boolean,
        default : true,
        required : true
    }
},
{
    timestamps : true
})

vendorSchema.index({ status: 1, createdAt: 1 });

const Vendor = mongoose.model("Vendor" , vendorSchema)

export default Vendor