import mongoose from "mongoose";

const productSchema = mongoose.Schema(
{
    name: {
        type: String,
        required: true,
        trim : true,
        minLength : 1,
        maxLength : 100
    },

    description: {
        type: String,
        required: true,
        trim : true,
        maxLength : 2000
    },

    price: {
        type: Number,
        required: true,
        min : 0
    },

    image:[ {
        type: String,
        required: true
    }],

    category: {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Category",
        required : true
    },

    stock: {
        type: Number,
        default: 0
    },

    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    } , 
    
    brand  :  {
        type : String,
        required : true
    }
},
{
    timestamps: true
});




const Product = mongoose.model("Product" , productSchema)


export default Product