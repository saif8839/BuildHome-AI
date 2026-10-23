import Coupon from "../models/couponModel.js";

const getCoupons = async (req, res) => {
    const now = new Date();

    const coupons = await Coupon.find({
        isActive: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
        ]
    })
        .populate("vendor", "businessName email phone")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        message: "Currently available coupons.",
        count: coupons.length,
        coupons
    });
};
const couponController = { getCoupons };

export default couponController;