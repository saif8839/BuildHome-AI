import Product from "../models/productModel.js"
import mongoose from "mongoose";

// Escape special regex characters from user input
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};


const getProducts = async (req, res) => {

    // 1. Get search query
    const rawSearch = req.query.search;

    // Get price query parameters
    const rawMinPrice = req.query.minPrice;
    const rawMaxPrice = req.query.maxPrice;

    // 3. Get category query parameter
    const rawCategory = req.query.category;

    const rawSort = req.query.sort;

    // Get pagination parameters
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;

    const sortOptions = {
        price_asc: { price: 1, _id: 1 },
        price_desc: { price: -1, _id: 1 },
        newest: { createdAt: -1, _id: -1 },
        oldest: { createdAt: 1, _id: 1 }
    };

    // 2. Validate search input
    if (rawSearch !== undefined && typeof rawSearch !== "string") {
        res.status(400);
        throw new Error("Invalid search query!");
    }

    const search = rawSearch?.trim();

    if (search && search.length > 100) {
        res.status(400);
        throw new Error("Search query cannot exceed 100 characters!");
    }

    // 3. Build MongoDB filter
    const filter = {
        isActive: true
    };



    // Validate category input type
    if (rawCategory !== undefined && typeof rawCategory !== "string") {
        res.status(400);
        throw new Error("Invalid category!");
    }

    const category = rawCategory?.trim();

    // Validate category ObjectId
    if (rawCategory !== undefined && (!category || !mongoose.isValidObjectId(category))) {
        res.status(400);
        throw new Error("Invalid category ID!");
    }

    // Apply category filter if provided
    if (category) {
        filter.category = category;
    }

    // Validate minimum price
    if (
        rawMinPrice !== undefined &&
        (
            typeof rawMinPrice !== "string" ||
            rawMinPrice.trim() === "" ||
            !Number.isFinite(Number(rawMinPrice)) ||
            Number(rawMinPrice) < 0
        )
    ) {
        res.status(400);
        throw new Error("Invalid minimum price!");
    }


    // Validate maximum price
    if (
        rawMaxPrice !== undefined &&
        (
            typeof rawMaxPrice !== "string" ||
            rawMaxPrice.trim() === "" ||
            !Number.isFinite(Number(rawMaxPrice)) || Number(rawMaxPrice) < 0
        )
    ) {
        res.status(400);
        throw new Error("Invalid maximum price!");
    }

    const minPrice = rawMinPrice !== undefined ? Number(rawMinPrice) : undefined;

    const maxPrice = rawMaxPrice !== undefined ? Number(rawMaxPrice) : undefined;

    if (
        minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice
    ) {
        res.status(400);
        throw new Error("Minimum price cannot exceed maximum price!");
    }

    // Apply price filter
    if (minPrice !== undefined || maxPrice !== undefined) {

        filter.price = {};

        if (minPrice !== undefined) {
            filter.price.$gte = minPrice;
        }

        if (maxPrice !== undefined) {
            filter.price.$lte = maxPrice;
        }
    }

    if (
        rawSort !== undefined &&
        typeof rawSort !== "string"
    ) {
        res.status(400);
        throw new Error("Invalid sorting parameter!");
    }

    const sortBy = rawSort?.trim();

    if (rawSort !== undefined && !Object.prototype.hasOwnProperty.call(sortOptions, sortBy)) {
        res.status(400);
        throw new Error("Invalid sorting option!");
    }

    const sort = sortBy ? sortOptions[sortBy] : sortOptions.newest;

    // Validate page
    if (
        rawPage !== undefined &&
        (
            typeof rawPage !== "string" ||
            !/^\d+$/.test(rawPage.trim()) ||
            Number(rawPage) < 1
        )
    ) {
        res.status(400);
        throw new Error("Invalid page number!");
    }

    // Validate limit
    if (rawLimit !== undefined &&
        (
            typeof rawLimit !== "string" ||
            !/^\d+$/.test(rawLimit.trim()) ||
            Number(rawLimit) < 1 ||
            Number(rawLimit) > 50
        )
    ) {
        res.status(400);
        throw new Error("Limit must be between 1 and 50!");
    }

    const page = rawPage !== undefined ? Number(rawPage) : 1;

    const limit = rawLimit !== undefined ? Number(rawLimit) : 10;

    const skip = (page - 1) * limit;    

    // 4. Apply search if provided
    if (search) {

        const escapedSearch = escapeRegex(search);

        filter.$or = [
            {
                productName: {
                    $regex: escapedSearch,
                    $options: "i"
                }
            },
            {
                brand: {
                    $regex: escapedSearch,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: escapedSearch,
                    $options: "i"
                }
            }
        ];
    }

    // 5. Fetch products
const [products, totalProducts] = await Promise.all([

    Product.find(filter)
        .populate("vendor", "businessName address phone email")
        .populate("category", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit),

    Product.countDocuments(filter)

]);

const totalPages = Math.ceil(totalProducts / limit);

    // 6. Return products
   return res.status(200).json({
    success: true,

    pagination: {
        page,
        limit,
        totalProducts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    },

    count: products.length,
    products
});
};





const getSingleProduct = async (req, res) => {
    const productId = req.params.pid

    const product = await Product.findById(productId).populate("vendor", "businessName address phone email")
        .populate("category", "name")
        .sort({ createdAt: -1 });

    if (!product || !product.isActive) {
        res.status(409)
        throw new Error("No Such Products Exist or Wrong Id or the Product is inactive!!")
    }


    res.status(201).json(product)

}



const productController = { getProducts, getSingleProduct }


export default productController
















