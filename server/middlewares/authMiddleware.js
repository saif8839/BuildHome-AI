import jwt from "jsonwebtoken"
import User from "../models/userModel.js"
import Vendor from "../models/vendorModel.js"

const forUser = async (req , res, next) =>
{
    
    try{
        let beToken = req.headers.authorization
        let token = beToken.split(' ')[1]

        if(beToken && beToken.split(' ')[0]==="Bearer")
        {
          let decoded =  jwt.verify(token , process.env.JWT_SECRET)
          let user = await User.findById(decoded.id)
          req.user = user
          if(user.role==="vendor")
          {
            let vendor = await Vendor.findOne({user : user._id})
            if(vendor)
            {
                req.vendor = vendor
            }
            else 
            {
                 res.status(404)
        throw new Error("Conflict for VendorId , User may Not Be a Vendor")
            }
          }
            next()
        }
        else{
        res.status(401)
        throw new Error("Unauthorized Access")
        }
    }
    catch(error)
    {
        res.status(401)
        throw new Error("Unauthorized Access")
    }
}



const forAdmin = async (req , res, next) =>
{
    
    try{
        let beToken = req.headers.authorization
        let token = beToken.split(' ')[1]

        if(beToken && beToken.split(' ')[0]==="Bearer")
        {
          let decoded =  jwt.verify(token , process.env.JWT_SECRET)
          let user = await User.findById(decoded.id)
          req.user = user
        if(user.role==="admin")
        {
            next()
        }
        else
            {
                     res.status(401)
        throw new Error("Unauthorized Access , Admin Only!!!")
            }
        }
        else{
        res.status(401)
        throw new Error("Unauthorized Access")
        }
    }
    catch(error)
    {
        res.status(401)
        throw new Error("Unauthorized Access")
    }
}

const protect = {forUser , forAdmin}

export default protect