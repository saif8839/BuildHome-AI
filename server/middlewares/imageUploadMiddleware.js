import multer from "multer"


const storage = multer.diskStorage(
    {
        destination : (req, file , cb)=>{
            cb(null , "uploads")
        },
        filename : (req, file , cb)=>{
           const filename = Date.now() + "." + file.originalname.split('.')[1]
            cb(null , filename)
        }
    }
)


const upload = multer({storage})


export default upload