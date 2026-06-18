import mongoose from "mongoose";



const vendorSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    name : {
        type : String, 
        required : [true , "Vendor Name Required"]
    },
    phone : {
        type : String, 
        required : [true , "Vendor phone Required"],
    },
    email : {
        type : String,
        required : [true , "Vendor Email Required"],
        unique : true
    },
    address: {
        type : String,
        required : [true , "Vendor Address Required"]
    },
    category : {
        type : String,
        required : [true , "Vendor Category Required"]
    },
    status : {
        type : String,
        required : true,
        enum : ["active" , "pending" , "suspended" , "hold"],
        default : "pending"
    }
},
{
    timestamps : true
})



const Vendor = mongoose.model("Vendor" , vendorSchema)

export default Vendor