import jwt from "jsonwebtoken"
import User from "../models/userModel.js"

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
        if(user.isAdmin)
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