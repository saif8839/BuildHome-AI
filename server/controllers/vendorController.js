import Product from "../models/productModel.js"
import Vendor from "../models/vendorModel.js"


const becomeVendor = async (req, res) =>
{
    const userId = req.user._id

    const vendorExist = await Vendor.findOne({user : userId})

    const {businessName , phone, email , address , category} = req.body

  if(vendorExist)
  {
      if(vendorExist.status === "suspended")
    {
        res.status(403)
        throw new Error("Can't Request your vendor profile is suspended , contact support.")
    }

    if(vendorExist.status === "active")
    {
        res.status(409)
        throw new Error("Profile is Active No Need to Request!!!")
    }
    
    if(vendorExist.status === "pending")
    {
        res.status(409)
        throw new Error("Wait for Approval , ALready Reqested!!!")
    }

     if(vendorExist.status === "rejected")
    {
       vendorExist.businessName = businessName
       vendorExist.email = email
       vendorExist.phone = phone 
       vendorExist.address = address
       vendorExist.category = category

       vendorExist.status = "pending"

       await vendorExist.save()

       res.status(200).json(
        {
            message : "Application resubmitted for Approval!!!",
            vendor : vendorExist
        }
       )

    }
  }

    

    if(!businessName || !phone || !email || !address || category.length===0 )
    {
        res.status(409)
        throw new Error("Please Fill required Details!!!")
    }

    const vendor = await Vendor.create({
        user : userId , businessName, phone , email , address , category
    })
 
    if(!vendor)
    {
        res.status(409)
        throw new Error("Vendor Not Created")
    }

    res.status(200).json({
        message : "Vendor application Submitted successfully!!!",
        vendor : vendor
    })
}

const addProduct = async (req, res) =>
{

    const {name , brand , category , price , stock , description } = req.body

    console.log(req.files)
    const image = req.files.map(file => file.filename)

    if(!name || !image || !brand || !category || price==null || stock==null || !description)
    {
        res.status(400)
        throw new Error("Fill All Important Details , Before Putting Out A Product!!!")
    }

    const userId = req.user._id

    const vendorExist = await Vendor.findOne({user : userId})

    if(!vendorExist)
    {
        res.status(404)
        throw new Error("No Such Vendor Exist , Please Register As Vendor!!!")
    }

    const product = {
        name , image , brand , category , price , stock , description , vendor : vendorExist._id
    }

    const newProduct = await Product.create(product)

    if(!newProduct)
    {
        res.status(404)
        throw new Error("Product Not Created!!!")
    }

    await newProduct.populate("vendor" , "name")
    await newProduct.populate("category" , "name")

    res.status(200).json(newProduct)
}

const getMyProducts = async (req , res)=>
{


    // console.log(req.user , req.vendor)

    const vendorId = req.vendor._id

    if(!vendorId)
    {
        res.status(404)
        throw new Error("Vendor not found")
    }
    
    const products = await Product.find({vendor : vendorId})

    if(!products || products.length === 0)
    {
        res.status(404)
        throw new Error("No Products Found!!!")
    }

    res.status(200).json(products)
}

const updateMyProduct = async (req , res) =>
{
    const productId = req.params.pid
    const vendorId = req.vendor._id

    if(!productId)
    {
        res.status(404)
        throw new Error("No Such Product or Id Exist")
    }

    const product = await Product.findById(productId)

    if(product.vendor.toString() !==  vendorId.toString())
    {
        res.status(409)
        throw new Error("Unable To Update Product")
    }


    const updatedProduct = await Product.findByIdAndUpdate(productId , req.body , {new : true})

    if(!updatedProduct)
    {
        res.status(409)
        throw new Error("Product Not Updated!!!")
    }

    res.status(200).json(updatedProduct)
}


const getAllVendors = async (req,res) =>
{
    const vendors = await Vendor.find()

    if(vendors.length === 0)
    {
        res.status(404)
        throw new Error("No Vendors Available")
    }

    res.status(200).json(vendors)

}


const getSingleVendor = async (req,res)=>
{
    const vendorId = req.params.vid
    const vendor = await Vendor.findById(vendorId)
    
    if(!vendor || !vendor.isActive)
    {
        res.status(200)
        throw new Error("Invalid Vendor Id , No Such Vendor Found")
    }

    res.status(200).json(vendor)

}



const vendorController = {
    becomeVendor , addProduct , getMyProducts , updateMyProduct , getAllVendors ,getSingleVendor
}


export default vendorController