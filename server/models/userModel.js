import express from "express";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true , "Please Enter Name"]
    },
    email : {
        type : String,
        required : [true , "Please Enter Email"],
        unique : true
    },
    password : {
        type : String,
        required : [true , "Please Enter Password"],
        select : false
    },
    phone : {
        type : String,
        required : [true , "Please Enter phone Number"]
    },
    isActive : {
        type : Boolean,
        default : true,
        required : true
    },
    isVendor : {
        type : Boolean,
        default : false,
        required : true 
    },
    credits : {
        type : Number,
        default : 5,
        required : true 
    },
    isAdmin : {
        type : Boolean,
        required : true,
        default : false 
    }
},
{
    timestamps : true 
}
)


const User = mongoose.model("User" , userSchema)

export default User