import Coupon from "../models/couponModel.js"
import Order from "../models/orderModel.js"
import Product from "../models/productModel.js"
import Vendor from "../models/vendorModel.js"
import mongoose from "mongoose"
import cancelOrders from "../services/orderCancellationService.js";
import uploadToCloudinary, { deleteFromCloudinary} from "../middlewares/cloudinaryUploadMiddlware.js";

import Category from "../models/categoryModel.js";



const becomeVendor = async (req, res) => {
    const userId = req.user._id

    const vendorExist = await Vendor.findOne({ user: userId })

    const { businessName, phone, email, address, category } = req.body

    // console.log(req.body.category , req.body.address)

    if (vendorExist) {
        if (vendorExist.status === "suspended") {
            res.status(403)
            throw new Error("Can't Request your vendor profile is suspended , contact support.")
        }

        if (vendorExist.status === "active") {
            res.status(409)
            throw new Error("Profile is Active No Need to Request!!!")
        }

        if (vendorExist.status === "pending") {
            res.status(409)
            throw new Error("Wait for Approval , ALready Reqested!!!")
        }

        if (vendorExist.status === "rejected") {
            vendorExist.businessName = businessName
            vendorExist.email = email
            vendorExist.phone = phone
            vendorExist.address = address
            vendorExist.category = category
            vendorExist.status = "pending"

            await vendorExist.save()

            res.status(200).json(
                {
                    message: "Application resubmitted for Approval!!!",
                    vendor: vendorExist
                }
            )

        }
    }

    if (!businessName || !phone || !email || !address || category.length === 0) {
        res.status(409)
        throw new Error("Please Fill required Details!!!")
    }

    //     console.log("category:", category);
    // console.log("isArray:", Array.isArray(category));
    // console.log("first item:", category?.[0]);
    // console.log("first item type:", typeof category?.[0]);

    const vendor = await Vendor.create({
        user: userId, businessName, phone, email, address, category
    })

    if (!vendor) {
        res.status(409)
        throw new Error("Vendor Not Created")
    }

    res.status(200).json({
        message: "Vendor application Submitted successfully!!!",
        vendor: vendor
    })
}



const addProduct = async (req, res) => {

    const {
        productName,
        brand,
        category,
        price,
        stock,
        description,
        unit
    } = req.body;

    const allowedUnits = [
        "piece", "bag", "kg", "ton", "liter", "meter",
        "square_feet", "cubic_feet", "cubic_meter",
        "box", "bundle"
    ];

    // 1. Validate required fields
    if (
        !productName?.trim() ||
        !brand?.trim() ||
        !category ||
        price == null || price === "" ||
        stock == null || stock === "" ||
        !description?.trim() ||
        !unit
    ) {
        return res.status(400).json({
            message: "Please provide all required product details."
        });
    }

    // 2. Validate unit
    if (!allowedUnits.includes(unit)) {
        return res.status(400).json({
            message: "Please choose a valid unit."
        });
    }

    // 3. Validate price and stock
    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
        return res.status(400).json({
            message: "Please provide a valid price."
        });
    }

    if (!Number.isSafeInteger(Number(stock)) || Number(stock) < 0) {
        return res.status(400).json({
            message: "Stock must be a valid non-negative integer."
        });
    }

    // 4. Find the authenticated user's vendor account
    const userId = req.user._id;

    const vendorExist = await Vendor.findOne({ user: userId });

    if (!vendorExist) {
        return res.status(403).json({
            message: "You must register as a vendor first."
        });
    }

    // 5. Check vendor approval
    if (vendorExist.status !== "active") {
        return res.status(403).json({
            message: "Your vendor account is not active."
        });
    }

    // 6. Validate category ID
    if (!mongoose.isObjectIdOrHexString(category)) {
        return res.status(400).json({
            message: "Invalid category ID."
        });
    }

    // 7. Check whether category exists
    const categoryExist = await Category.findById(category);

    if (!categoryExist) {
        return res.status(400).json({
            message: "Selected category does not exist."
        });
    }

    // 8. Check uploaded files
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            message: "Upload at least one product image."
        });
    }

    // 9. Upload images to Cloudinary
    const uploadResults = await Promise.all(
        req.files.map(file => uploadToCloudinary(file.path))
    );

    const image = uploadResults.map(result => result.url);

    const imagePublicIds = uploadResults.map(
        result => result.publicId
    );

    // 10. Create product
    const product = {
        productName,
        image,
        imagePublicIds,
        brand,
        category,
        price: Number(price),
        stock: Number(stock),
        description,
        vendor: vendorExist._id,
        unit
    };

    const newProduct = await Product.create(product);

    // 11. Populate vendor and category details
    await newProduct.populate(
        "vendor",
        "businessName email phone address.city address.street -_id"
    );

    await newProduct.populate("category", "name -_id");

    // 12. Send response
    return res.status(201).json({
        message: "Product created successfully.",
        product: newProduct
    });
};



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

const updateMyProduct = async (req, res) => {

    const { pid } = req.params;
    const vendorId = req.vendor?._id;

    // 1. Validate product ID
    if (!mongoose.isValidObjectId(pid)) {
        return res.status(400).json({
            message: "Invalid Product ID."
        });
    }

    if (!vendorId) {
        return res.status(403).json({
            message: "Vendor account not found."
        });
    }

    // 2. Find product
    const product = await Product.findById(pid);

    if (!product) {
        return res.status(404).json({
            message: "Product not found."
        });
    }

    // 3. Check product ownership
    if (product.vendor.toString() !== vendorId.toString()) {
        return res.status(403).json({
            message: "You are not authorized to update this product."
        });
    }

    // 4. Extract only permitted fields
    const allowedFields = [
        "productName",
        "brand",
        "category",
        "price",
        "stock",
        "description",
        "unit"
    ];

    const updates = {};

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }

    // 5. Validate supplied string fields
    for (const field of ["productName", "brand", "description"]) {
        if (updates[field] !== undefined) {

            if (
                typeof updates[field] !== "string" ||
                !updates[field].trim()
            ) {
                return res.status(400).json({
                    message: `${field} cannot be empty.`
                });
            }

            updates[field] = updates[field].trim();
        }
    }

    // 6. Validate price
    if (updates.price !== undefined) {

        const price = Number(updates.price);

        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                message: "Please provide a valid price."
            });
        }

        updates.price = price;
    }

    // 7. Validate stock
    if (updates.stock !== undefined) {

        const stock = Number(updates.stock);

        if (!Number.isSafeInteger(stock) || stock < 0) {
            return res.status(400).json({
                message: "Please provide a valid stock quantity."
            });
        }

        updates.stock = stock;
    }

    // 8. Validate unit
    const allowedUnits = [
        "piece", "bag", "kg", "ton", "liter", "meter",
        "square_feet", "cubic_feet", "cubic_meter",
        "box", "bundle"
    ];

    if (
        updates.unit !== undefined &&
        !allowedUnits.includes(updates.unit)
    ) {
        return res.status(400).json({
            message: "Please choose a valid unit."
        });
    }

    // 9. Validate category if supplied
    if (updates.category !== undefined) {

        if (!mongoose.isObjectIdOrHexString(updates.category)) {
            return res.status(400).json({
                message: "Invalid category ID."
            });
        }

        const categoryExist = await Category.findById(updates.category);

        if (!categoryExist) {
            return res.status(400).json({
                message: "Selected category does not exist."
            });
        }
    }

    // 10. Check whether anything was provided
    const hasNewImages = req.files && req.files.length > 0;

    if (Object.keys(updates).length === 0 && !hasNewImages) {
        return res.status(400).json({
            message: "Please provide at least one field or image to update."
        });
    }

    // 11. Upload new images if provided
    let uploadResults = [];

    if (hasNewImages) {

        const results = await Promise.allSettled(
            req.files.map(file => uploadToCloudinary(file.path))
        );

        const failedUpload = results.find(
            result => result.status === "rejected"
        );

        uploadResults = results
            .filter(result => result.status === "fulfilled")
            .map(result => result.value);

        // Clean up successfully uploaded images if another upload failed
        if (failedUpload) {

            await Promise.allSettled(
                uploadResults.map(result =>
                    deleteFromCloudinary(result.publicId)
                )
            );

            throw failedUpload.reason;
        }

        updates.image = uploadResults.map(result => result.url);

        updates.imagePublicIds = uploadResults.map(
            result => result.publicId
        );
    }

    // 12. Keep old Cloudinary IDs for deletion after successful update
    const oldImagePublicIds = [...(product.imagePublicIds || [])];

    // 13. Update product document
    try {

        product.set(updates);

        await product.save();

    } catch (error) {

        // Remove newly uploaded images if database update fails
        await Promise.allSettled(
            uploadResults.map(result =>
                deleteFromCloudinary(result.publicId)
            )
        );

        throw error;
    }

    // 14. Delete old Cloudinary images after successful replacement
    if (hasNewImages && oldImagePublicIds.length > 0) {

        const deletionResults = await Promise.allSettled(
            oldImagePublicIds.map(publicId =>
                deleteFromCloudinary(publicId)
            )
        );

        deletionResults.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error(
                    `Failed to delete old Cloudinary image ${oldImagePublicIds[index]}:`,
                    result.reason
                );
            }
        });
    }

    // 15. Populate and respond
    await product.populate("vendor", "businessName email phone");
    await product.populate("category", "name");

    return res.status(200).json({
        message: "Product updated successfully.",
        product
    });
};

const getAllVendors = async (req, res) => {
    const vendors = await Vendor.find({ isActive: { $eq: true } }).populate("user", "name email phone role avatar").sort({ createdAt: -1 });

    if (vendors.length === 0) {
        res.status(404)
        throw new Error("No Vendors Available")
    }

    res.status(200).json(vendors)

}


const getSingleVendor = async (req, res) => {
    const vendorId = req.params.vid
    const vendor = await Vendor.findById(vendorId).populate("user", "name email phone role avatar")

    if (!vendor || !vendor.isActive) {
        res.status(200)
        throw new Error("Invalid Vendor Id , No Such Vendor Found")
    }

    res.status(200).json(vendor)

}



const addCoupons = async (req, res) => {
    const { couponCode, couponDiscount, discountType, expiresAt } = req.body

    const vendorId = req.vendor._id

    const vendorExist = await Vendor.findById(vendorId)

    if (!vendorExist) {
        res.status(404)
        throw new Error("Only Vendors can create Coupon ,  Id is invalid , contact admin")
    }

    if (vendorExist.isActive === false || vendorExist.status !== "active") {
        res.status(404)
        throw new Error("Only Vendors can create Coupon , inactive Vendor")
    }

    if (!couponCode || !couponDiscount || !discountType) {
        res.status(409)
        throw new Error("FIll all Required Coupon Details!!!")
    }
    let coupon = null

    // 4. Validate expiry date if provided
    let expiryDate;

    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== "") {
        expiryDate = new Date(expiresAt);

        if (
            Number.isNaN(expiryDate.getTime()) ||
            expiryDate <= new Date()
        ) {
            return res.status(400).json({
                message: "Expiry date must be a valid future date."
            });
        }
    }

    coupon = { couponCode, couponDiscount, discountType, vendor: vendorId }

    if (expiryDate) {
        coupon.expiresAt = expiryDate
    }

    console.log(coupon)

    const newCoupon = await Coupon.create(coupon)

    if (!newCoupon) {
        res.status(401)
        throw new Error("Unbale to Create a Coupon!!!")
    }

    res.status(200).json({
        message: "Coupon Created!!!",
        coupon: newCoupon
    })

}

const updateCoupon = async (req, res) => {
    const couponId = req.params.cid

    const couponExist = await Coupon.findById(couponId)

    if (!couponExist) {
        res.status(404)
        throw new Error("No or Coupon or Coupon Id Exist!!!")
    }

    const vendor = await Vendor.findOne({
        user: req.user._id
    });

    if (!vendor || vendor.status !== "active") {
        return res.status(403).json({
            message: "An active vendor account is required."
        });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, req.body, { new: true, runValidators: true })

    if (!updatedCoupon) {
        res.status(401)
        throw new Error("Facing some Issues in Updating Coupon , please Retry!!")
    }

    res.status(200).json(
        {
            message: "Coupon Updated Succesfully...",
            coupon: updatedCoupon
        }
    )
}


const getVendorOrders = async (req, res) => {

    if (!req.vendor) {
        res.status(401);
        throw new Error("Vendor authentication required!");
    }

    if (req.vendor.status !== "active" || req.vendor.isActive !== true) {
        res.status(403);
        throw new Error("Your vendor account is not active!");
    }

    const vendorId = req.vendor._id


    const orders = await Order.find({
        vendor: vendorId
    })
        .populate("user", "name email phone")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: orders.length,
        orders
    });
}

const getSingleVendorOrder = async (req, res) => {
    const vendor = req.vendor;
    const { oid } = req.params;

    if (!vendor) {
        res.status(403);
        throw new Error("Vendor account not found!");
    }

    if (vendor.status !== "active" || vendor.isActive !== true) {
        res.status(403);
        throw new Error("Your vendor account is not active!");
    }

    if (!mongoose.isValidObjectId(oid)) {
        res.status(400);
        throw new Error("Invalid Order ID!");
    }

    const order = await Order.findOne({
        _id: oid,
        vendor: vendor._id
    }).populate("user", "name email phone");


    if (!order) {
        res.status(404);
        throw new Error("Order not found!");
    }

    return res.status(200).json({
        success: true,
        order
    });

}


const updateVendorOrderStatus = async (req, res) => {

    const vendor = req.vendor;
    const { oid } = req.params;

    const { orderStatus: nextStatus } = req.body;

    const rawCodPaymentCollected = req.body.codPaymentCollected;

    const codPaymentCollected =
        rawCodPaymentCollected === true ||
        rawCodPaymentCollected === "true";

    // if (nextStatus === "delivered" && !codPaymentCollected) {
    //     res.status(400)
    //     throw new Error("Please confirm if the Payment is Collected Before changing the Order Status to Delivered!!")
    // }

    // 1. Validate vendor
    if (!vendor) {
        res.status(401);
        throw new Error("Vendor authentication required!");
    }

    if (vendor.status !== "active" || vendor.isActive !== true) {
        res.status(403);
        throw new Error("Your vendor account is not active!");
    }

    // 2. Validate Order ID
    if (!mongoose.isValidObjectId(oid)) {
        res.status(400);
        throw new Error("Invalid Order ID!");
    }

    // 3. Define valid transitions
    const allowedTransitions = {
        pending: ["confirmed"],
        confirmed: ["processing"],
        processing: ["shipped"],
        shipped: ["delivered"]
    };

    // 4. Find Order belonging to this vendor
    const order = await Order.findOne({
        _id: oid,
        vendor: vendor._id
    });

    if (!order) {
        res.status(404);
        throw new Error("Order not found!");
    }

    // 5. Validate requested status
    const allowedNextStatuses =
        allowedTransitions[order.orderStatus] || [];

    if (!allowedNextStatuses.includes(nextStatus)) {
        res.status(409);
        throw new Error(
            `Cannot change order status from ${order.orderStatus} to ${nextStatus}!`
        );
    }

    // 6. Payment and inventory checks before confirmation
    const updateFields = {
        orderStatus: nextStatus
    };

    if (nextStatus === "confirmed") {

        if (order.paymentMethod === "online") {

            if (
                order.paymentStatus !== "paid" ||
                order.inventoryStatus !== "committed"
            ) {
                res.status(409);
                throw new Error(
                    "Online payment must be completed before confirming the order!"
                );
            }

        } else if (order.paymentMethod === "cod") {

            if (
                order.paymentStatus !== "pending" ||
                order.inventoryStatus !== "reserved"
            ) {
                res.status(409);
                throw new Error("COD order is not eligible for confirmation!");
            }

            updateFields.inventoryStatus = "committed";
        }
    }

    // 7. Handle payment collection during delivery

    if (nextStatus === "delivered") {

        if (order.paymentMethod === "cod") {

            // Verify that vendor confirms cash collection
            if (codPaymentCollected !== true) {
                res.status(409);
                throw new Error(
                    "Please confirm COD payment collection before delivering the order!"
                );
            }

            // Verify existing payment and inventory state
            if (
                order.paymentStatus !== "pending" ||
                order.inventoryStatus !== "committed"
            ) {
                res.status(409);
                throw new Error(
                    "COD order is not eligible for delivery!"
                );
            }

            // Update payment collection details
            updateFields.paymentStatus = "paid";
            updateFields.codCollectedAt = new Date();
            updateFields.codCollectedBy = vendor._id;

        }

        else if (order.paymentMethod === "online") {

            if (
                order.paymentStatus !== "paid" ||
                order.inventoryStatus !== "committed"
            ) {
                res.status(409);
                throw new Error(
                    "Online payment must be completed before delivery!"
                );
            }

        }
    }

    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: order._id,
            vendor: vendor._id,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            inventoryStatus: order.inventoryStatus
        },
        {
            $set: updateFields
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedOrder) {
        res.status(409);
        throw new Error("Order status changed concurrently. Please retry!");
    }

    return res.status(200).json({
        success: true,
        message: `Order status updated to ${nextStatus}!`,
        order: updatedOrder
    });
};


const cancelVendorOrder = async (req, res) => {

    const vendor = req.vendor;
    const { oid } = req.params;
    const { reason } = req.body ?? {};

    // 1. Validate vendor authentication
    if (!vendor) {
        res.status(401);
        throw new Error("Vendor authentication required!");
    }

    // 2. Validate vendor account
    if (vendor.status !== "active" || vendor.isActive !== true) {
        res.status(403);
        throw new Error("Your vendor account is not active!");
    }

    // 3. Validate Order ID
    if (!mongoose.isValidObjectId(oid)) {
        res.status(400);
        throw new Error("Invalid Order ID!");
    }

    // 4. Validate cancellation reason
    if (
        typeof reason !== "string" ||
        !reason.trim() ||
        reason.trim().length > 500
    ) {
        res.status(400);
        throw new Error("Please provide a valid cancellation reason!");
    }

    // 5. Call shared cancellation service
    const cancelledOrders = await cancelOrders({
        orderIds: [oid],

        actor: {
            type: "vendor",
            id: vendor._id
        },

        reason
    });

    // 6. Send response
    return res.status(200).json({
        success: true,
        message: "Order cancelled successfully!",
        count: cancelledOrders.length,
        orders: cancelledOrders
    });
};



const vendorController = {
    becomeVendor, addProduct, getMyProducts, updateMyProduct, getAllVendors, getSingleVendor, addCoupons, updateCoupon, getVendorOrders, getSingleVendorOrder,
    updateVendorOrderStatus, cancelVendorOrder
}


export default vendorController