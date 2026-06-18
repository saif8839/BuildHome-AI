import Vendor from "../models/vendorModel.js"


const becomeVendor = async (req, res) =>
{
    const userId = req.user._id

    const userExist = await Vendor.findOne({user : userId})

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

    const {name , phone, email , address , category} = req.body

    if(!name || !phone || !email || !address || !category )
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




const vendorController = {
    becomeVendor 
}


export default vendorController