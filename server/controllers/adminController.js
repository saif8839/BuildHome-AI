import User from "../models/userModel.js"

const getAllUsers = async (req ,res)=>
{
    const allUsers = await User.find()
    
    if(!allUsers)
    {
        res.status(409)
        throw new Error("No Users Found...")
    }

    res.status(200).json(allUsers)
}


const updateUser = async(req , res) =>
{
    res.send("update User")
}

const getAllVendors = async (req , res ) =>
{ 
    res.send("get vendor")
}

const updateVendor = async (req, res) =>
{
    res.send("update vendor")
}


const getAllProducts = async (req , res) =>
{
    res.send("get products")
}

const updateProduct = async (req,res) =>
{
    res.send("Update Products")
}


const getAllOrders = async (req ,res) =>
{
    res.send("get Order")
}

const getAllRatings = async (req,res) =>
{
    res.send("get Ratings")
}



const adminController = {getAllOrders ,getAllProducts , getAllRatings , getAllUsers ,getAllVendors , updateUser , updateVendor , updateProduct}

export default adminController

