import { kMaxLength } from "buffer";
import mongoose from "mongoose";



const categorySchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true , "Please Enter a Valid Category"],
        unique : true,
        trim : true,
        maxLength : [80 , "Maximum category Length has to be 80"],
        minLength : 1
    }
},
{
    timestamps : true
}
)



const Category = mongoose.model("Category" , categorySchema)


export default Category