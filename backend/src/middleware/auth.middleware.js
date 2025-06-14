// If you don't already have this middleware, add it to your middleware folder or auth-related files
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = { userId: user._id, user };
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware:", error);
    res.status(401).json({ message: "Unauthorized - Invalid Token" });
  }
};