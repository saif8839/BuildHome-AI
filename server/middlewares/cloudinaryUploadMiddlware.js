import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs"
import dotenv from "dotenv"

dotenv.config()


// console.log( process.env.CLOUDINARY_API_KEY  ,  process.env.CLOUDINARY_API_SECRET)


cloudinary.config({ 
  cloud_name: 'dhsoji9ch', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});



const uploadToCloudinary = async (filePath) =>
{

 try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: "buildhome/products",
            resource_type: "auto"
        });

        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    } finally {
        // Remove the temporary local file whether upload succeeds or fails.
       try{
        fs.unlinkSync(filePath)
       }
       catch (error) {
            console.error("Failed to delete local file:", error.message);
        }
    }
};





export default uploadToCloudinary 



// import { v2 as cloudinary } from "cloudinary";
// import fs from "node:fs/promises";
// import dotenv from "dotenv";

// dotenv.config();

// cloudinary.config({
//     cloud_name: "dhsoji9ch",
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const uploadToCloudinary = async (filePath) => {
//     try {
//         const result = await cloudinary.uploader.upload(filePath, {
//             folder: "buildhome/products"
//         });

//         return {
//             url: result.secure_url,
//             publicId: result.public_id
//         };
//     } finally {
//         await fs.unlink(filePath).catch(() => {});
//     }
// };

// export default uploadToCloudinary;