import uploadToCloudinary from "../middlewares/cloudinaryUploadMiddlware.js"
import Product from "../models/productModel.js"
import Vendor from "../models/vendorModel.js"


const becomeVendor = async (req, res) =>
{
    const userId = req.user._id

    const vendorExist = await Vendor.findOne({user : userId})

    const {businessName , phone, email , address , category} = req.body

    // console.log(req.body.category , req.body.address)

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

//     console.log("category:", category);
// console.log("isArray:", Array.isArray(category));
// console.log("first item:", category?.[0]);
// console.log("first item type:", typeof category?.[0]);

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

    const {productName , brand , category , price , stock , description , unit} = req.body

    const allowedUnits =  ["piece" , "bag" , "kg" , "ton" , "liter" , "meter" , "square_feet" , "cubic_feet" , 
                           "cubic_meter" , "box" , "bundle"]

if (!allowedUnits.includes(unit)) {
    return res.status(400).json({
        message: "Please choose a valid unit."
    });
}
 
      // 1. Check required request fields
    if (productName == null || brand == null || category == null || price == null || price === "" || stock == null || stock === "" || description == null || unit == null) {
        return res.status(400).json({
            message: "Please provide all required product details."
        });
    }

    // console.log(req.files)

     // 2. Check uploaded files
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            message: "Upload at least one product image."
        });
    }


    // const image = req.files.map(file => file.filename);
    // console.log(image)

    // Upload To Cloudinary

       const uploadResults = await Promise.all(req.files.map(file => uploadToCloudinary(file.path)));

        // console.log(uploadResults)

        const image = uploadResults.map(result => result.url);

        // console.log(image)

     // 3. Find the authenticated user's vendor account
    const userId = req.user._id

    const vendorExist = await Vendor.findOne({user : userId})

    if (!vendorExist) {
        return res.status(403).json({
            message: "You must register as a vendor first."
        });
    }

    // 4. Check vendor approval
    if (vendorExist.status !== "active") {
        return res.status(403).json({
            message: "Your vendor account is not active."
        });
    }

    //  // 5. Check that the category exists
    // if (!mongoose.isObjectIdOrHexString(category)) {
    //     return res.status(400).json({
    //         message: "Invalid category ID."
    //     });
    // }

    // const categoryExist = await Category.findById(category);

    // if (!categoryExist) {
    //     return res.status(400).json({
    //         message: "Selected category does not exist."
    //     });
    // }


    const product = {
        productName , image , brand , category , price , stock , description , vendor : vendorExist._id , unit
    }

    const newProduct = await Product.create(product)

    if(!newProduct)
    {
        res.status(404)
        throw new Error("Product Not Created!!!")
    }

    await newProduct.populate("vendor" , "businessName email phone address.city address.street -_id")
    await newProduct.populate("category" , "name -_id")

    // console.log(newProduct)

    res.status(200).json({
        message : "product Created Successfully...",
        product : newProduct
    })
}




const getMyProducts = async (req, res) => {
  
    // Check whether vendor middleware supplied the vendor
  
    if (!req.vendor) {
        return res.status(403).json({
            message: "Vendor account not found."
        });
    }

    const vendorId = req.vendor._id;

    const products = await Product.find({ vendor: vendorId })
        .populate("category", "name")
        .sort({ createdAt: -1 });

    //     const populatedProducts = await Promise.all(products.map(
    // async (product) => {
    //     await product.populate("vendor", "businessName")
    //     return product
    // }))

    return res.status(200).json({
        count: products.length,
       products
    });
};

const updateMyProduct = async (req , res) =>
{
    const productId = req.params.pid
    const vendorId = req.vendor._id

    const product = await Product.findById(productId)

     if(!product)
    {
        res.status(404)
        throw new Error("No Such Product Exist or Invalid Product Id!!!")
    }

    if(product.vendor.toString() !==  vendorId.toString())
    {
        res.status(409)
        throw new Error("Unable To Update Product")
    }


    const updatedProduct = await Product.findByIdAndUpdate(productId , req.body , {new : true , runValidators : true})

    if(!updatedProduct)
    {
        res.status(409)
        throw new Error("Product Not Updated!!!")
    }

    res.status(200).json(updatedProduct)
}


const getAllVendors = async (req,res) =>
{
    const vendors = await Vendor.find({isActive  : {$eq : true}}).populate("user" , "name email phone role avatar")

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
    const vendor = await Vendor.findById(vendorId).populate("user" , "name email phone role avatar")
    
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