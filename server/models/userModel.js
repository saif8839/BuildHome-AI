import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {
         type: String,
            required: [true, "Please Enter Name"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [70, "Name cannot exceed 70 characters"]
    },
    email : {
           type: String,
            required: [true, "Please Enter Email"],
            unique: true,
            trim: true,
            lowercase: true
    },
    password : {
        type : String,
        required : [true , "Please Enter Password"],
        select : false
    },
    phone : {
        type : String,
        required: [true, "Please Enter Phone Number"],
            trim: true,
            unique : true 
    },
    isActive : {
        type : Boolean,
        default : true,
    },
    role: {
    type: String,
    enum: ["user", "vendor", "admin"],
    default: "user"
},
    credits : {
        type : Number,
        default : 5,
        required : true 
    },
    avatar: {
    type: String,
    default: null
}
},
{
    timestamps : true 
}
)


const User = mongoose.model("User" , userSchema)

export default User




// I CAN ADD
// Password reset fields
// If you implement:
// "Forgot Password"
// you'll need temporary reset information somewhere.

// passwordResetToken: {
//     type: String,
//     select: false
// },

// passwordResetExpires: {
//     type: Date,
//     select: false
// }


// emailVerified

// If you're going to build proper authentication, this is useful:

// emailVerified: {
//     type: Boolean,
//     default: false
// }