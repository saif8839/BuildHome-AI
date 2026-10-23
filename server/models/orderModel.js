import mongoose from "mongoose";


const orderSchema = new mongoose.Schema(
{
    user : {
        type : mongoose.Schema.Types.ObjectId,
        index  : true,
        ref : "User"
    }

}
)

const Order = mongoose.model("Order" , orderSchema)

export default orderSchema 