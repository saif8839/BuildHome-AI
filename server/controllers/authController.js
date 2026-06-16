import User from "../models/userModel.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const registerUser = async (req , res) =>
{
    
    const {name , email , phone , password} = req.body

    if(!name || !email || !phone || !password)
    {
        res.status(409)
        throw new Error("Plaese fill All Details!!!")
    }


    const userExist = await User.findOne(
        {
            $or : [ { email : email} , {phone : phone}]
        }
    )

    if(userExist)
    {
        res.status(409)
        throw new Error("User Already Exist!!!")
    }

    const Salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password , Salt)

    const newUser =  await User.create({
        name : name , email : email , password : hashedPassword , phone : phone
    })

    if(!newUser)
    {
        res.status(409)
        throw new Error("User Not Created")
    }

    const userObj = newUser.toObject()

    delete userObj.password;
    

    res.status(200).json(
        {
            ...userObj,
            token : generateToken(userObj._id)
        }
    )
    

}



const loginUser = async (req , res) =>
{
   const {email , password} = req.body

   if(!email || !password) 
   {
    res.status(409)
    throw new Error("Please Fill All Details!!!")
   }

   const user = await User.findOne({
    email : email
   }).select("+password")

   


   if(user && await bcrypt.compare(password , user.password))
   {
    const userObj = user.toObject()
    delete userObj.password
    userObj.token = generateToken(user._id)
    res.status(200).json(userObj)
   }
   else
   {
    res.status(409)
    throw new Error("Invalid Credentials!!!")
   }



}

const privateController = async (req,res) =>
{
    // console.log(req.user)
        res.send("PRIVATE CONTROLLER THIS SIDE..")
}

const generateToken = (id) =>
{
    return jwt.sign({id} , process.env.JWT_SECRET , {expiresIn : '30d'})
}

const userController = {registerUser , loginUser ,privateController} 

export default userController
