import mongoose from "mongoose";
import dns from 'dns'

const connectDB = async () =>
{
     dns.setServers(['8.8.8.8','8.8.4.4'])
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`DATABASE CONNECTED SUCCESSFULLY : ${conn.connection.name}`.green)
    }
    catch(error)
    {
        console.log(`DATABASE CONNECTED FAILED`.red)
        console.log(error.message)
    }
}

export default connectDB