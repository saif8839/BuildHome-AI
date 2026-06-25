import Vendor from "../models/vendorModel.js"


const becomeVendor = async (req, res) =>
{
    const userId = req.user._id

    const userExist = await Vendor.findOne({user : userId})

  if(userExist)
  {
      if(userExist.status === "suspended")
    {
        res.status(200)
        throw new Error("Can't Request Profile is Rejected")
    }

    if(userExist.status === "active")
    {
        res.status(409)
        throw new Error("Profile is Active No Need to Request!!!")
    }
    
    if(userExist.status === "pending")
    {
        res.status(200)
        throw new Error("Wait for Approval , ALready Reqested!!!")
    }
  }

    const {name , phone, email , address , category} = req.body

    if(!name || !phone || !email || !address || !category.length===0 )
    {
        res.status(409)
        throw new Error("Please Fill required Details!!!")
    }

    const vendor = await Vendor.create({
        user : userId , name, phone , email , address , category
    })

    if(!vendor)
    {
        res.status(409)
        throw new Error("Vendor Not Created")
    }

    res.status(200).json(vendor)
}

const addProduct = async (req, res) =>
{

    const {name , image , brand , category , price , stock , description } = req.body

    if(!name || !image || !brand || !category || !price || !stock || !description)
    {
        res.status(409)
        throw new Error("Fill All Important Details , Before Putting Out A Product!!!")
    }

    const userId = req.user._id

    const vendorExist = await Vendor.findOne({user : userId})

    if(!vendorExist)
    {
        res.status(409)
        throw new Error("No Such Vendor Exist , Please Register As Vendor!!!")
    }



    res.status(200).json({
        msg : "products"
    })
}

const vendorController = {
    becomeVendor , addProduct
}


export default vendorController