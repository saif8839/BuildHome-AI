import capitalizeWords from "../features/capitalizeWords.js"
import Category from "../models/categoryModel.js"
import Product from "../models/productModel.js"
import User from "../models/userModel.js"
import Vendor from "../models/vendorModel.js"

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
    const vendors = await Vendor.find()

    if(!vendors)
    {
        res.status(409)
        throw new Error("No Vendors Found!!!")
    }

    res.status(201)
    res.json(vendors)

}

const updateVendor = async (req, res) =>
{
    const vendorId = req.params.vid

    const vendor = await Vendor.findById(vendorId)

    if(!vendor)
    {
        res.status(201)
        throw new Error("No such Vendor Exist!!!")
    }

    const {status} = req.body

    if(!status)
    {
        res.status(409)
        throw new Error("Please Send Status to Update!!!")
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(vendor._id , {status : status} , {new : true})

    if(!updateVendor)
    {
        res.status(404)
        throw new Error("Vendor Not Created!!!")
    }
    let user = await User.findById(vendor.user)

    if(!user)
    {
        res.status(404)
        throw new Error("Invalid User Id")
    }

    await User.findByIdAndUpdate(vendor.user , {isVendor : true} , {new : true})

    res.status(201).json(vendor)

}

const addProductCategory = async (req,res) =>
{

    const {name} = req.body

    if(!name)
    {
        res.status(409)
        throw new Error("please Provide The Category Name!")
    }
     
    const newWord = capitalizeWords(name)

    const existingCategory = await Category.findOne({name : newWord})

    if(existingCategory)
    {
        res.status(409)
        throw new Error("Same Category Exist , Can't Allow Duplicates...")
    }

    const newCategory = await Category.create(
        {
            name : newWord
        }
    )


    if(!newCategory)
    {
        res.status(409)
        throw new Error("Category Not Created!!!")        
    }

    res.status(200).json(newCategory)

}


const getProductCategory = async (req,res)=>
{
    const allCategory = await Category.find()

    console.log(allCategory.length)

    if(allCategory.length === 0)
    {
        res.status(409)
        throw new Error("No Catgeory Found")
    }

    res.status(200).json(allCategory)
}

const removeProductCategory = async (req ,res)=>
    {
        
    
        const {did} = req.params
        
        
    const productUsingCategory = await Product.countDocuments({category : did})

    if(productUsingCategory.length > 0)
    {
        res.status(409)
        throw new Error("Cannot delete category because products are assigned to it")
    }
    
    const checkCategory  = await Category.findByIdAndDelete(did)

    if(!checkCategory)
    {
        res.status(404)
        throw new Error("No Such Category Found!!!")
    }

    res.status(200).json({
        message : "Category Deleted",
        id : checkCategory._id,
        name : checkCategory.name
    })
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



const adminController = {removeProductCategory , getProductCategory , addProductCategory ,getAllOrders ,getAllProducts , getAllRatings , getAllUsers ,getAllVendors , updateUser , updateVendor , updateProduct}

export default adminController

