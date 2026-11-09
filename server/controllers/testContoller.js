import Order from "../models/orderModel.js"


const getAllCreatedOrders = async (req,res)=>
{
    const orders = await Order.find()

    if(orders.length === 0)
    {
        res.status(400)
        throw new Error("No Orders AVailable !!")
    }

    res.status(200).json({
        orderCount : orders.length,
        orders : orders
    })

}


const testController = {getAllCreatedOrders}

export default testController