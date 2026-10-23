import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
{
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [100, "Product name cannot exceed 100 characters"]
    },

    description: {
         type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    }, 
    
    brand  :  {
         type: String,
      required: [true, "Brand is required"],
      trim: true,
      minlength: [1, "Brand cannot be empty"],
      maxlength: [100, "Brand cannot exceed 100 characters"]
    },

    price:  {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
        validate: {
          validator: Number.isFinite,
          message: "Price must be a finite number"
        }
    },
  image: {
      type: [{
        type: String,
        trim: true
      }],
      required: true,
      default: undefined,
      validate: {
        validator: images =>
          Array.isArray(images) &&
          images.length >= 1 &&
          images.length <= 8 &&
          images.every(img => img.length > 0),
        message: "A product must have between 1 and 8 valid images"
      }
    },

    category: {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Category",
        required : true
    },

    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: Number.isFinite,
        message: "Stock must be a finite number"
      }
    },

     unit: {
      type: String,
      required: [true, "Selling unit is required"],
      enum: [
        "piece",
        "bag",
        "kg",
        "ton",
        "liter",
        "meter",
        "square_feet",
        "cubic_feet",
        "cubic_meter",
        "box",
        "bundle"
      ]
    },

    isActive: {
        type: Boolean,
        default: true
    } 
},
{
    timestamps: true
});




const Product = mongoose.model("Product" , productSchema)


export default Product