import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export async function signup(req, res){
    const  { email, password, fullName} = req.body;

    try{

        if(!email || !password || !fullName){
            return res.status(400).json({ message: "All fields are required"});
        }

        if(password.length < 6){
            return res.status(400).json({ message: "Password must be at least 6 characters "});
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return res.status(400).json({ message: "Invalid email format"});
        }

        const existingUser = await User.findOne ({ email});
        if(existingUser){
            return res.status(400).json({ message: "Email already exists, please use a different one"});
        }

        const idx=Math.floor(Math.random() * 100) + 1;
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`

        const newUser = await User.create({
            email,
            fullName,
            password,
            profilePic: randomAvatar,
        });

        try{
            await upsertStreamUser({
                id: newUser._id.toString(),
                name: newUser.fullName,
                image: newUser.profilePic || "",
            });
            console.log(`Stream user create for ${newUser.fullName}`);
        }catch (error) {
            console.log("Error creating Stream user: ",error);
        }
        

        const token = jwt.sign({ userId: newUser._id}, process.env.JWT_SECRET_KEY, {
            expiresIn: "7d",
        });

        res.cookie("jwt", token,{
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production"  
        });

        res.status(201).json({success: true, user:newUser});

    } catch (error){
        console.log("Error in signup controllet", error);
        res.status(500).json({ message: "Internet Server Error"});
    }
}

export async function login(req, res) {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
  
      const isPasswordCorrect = await user.matchPassword(password);
      if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });
  
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: "7d",
      });
  
      res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true, // prevent XSS attacks,
        sameSite: "strict", // prevent CSRF attacks
        secure: process.env.NODE_ENV === "production",
      });
  
      res.status(200).json({ success: true, user });
    } catch (error) {
      console.log("Error in login controller", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
  
  export function logout(req, res) {
    res.clearCookie("jwt");
    res.status(200).json({ success: true, message: "Logout successful" });
  }

  export async function onboarding(req, res) {
    try {
      const { userId } = req.user; // Assuming you have middleware that extracts user from JWT
      const {
        bio,
        nativeLanguage,
        learningLanguage,
        location
      } = req.body;
  
      // Find and update the user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          bio: bio || "",
          nativeLanguage: nativeLanguage || "",
          learningLanguage: learningLanguage || "",
          location: location || "",
          isOnboarded: true
        },
        { new: true } // Return the updated document
      ).select("-password"); // Exclude password field from response
  
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // Update Stream user if needed
      try {
        await upsertStreamUser({
          id: userId,
          name: updatedUser.fullName,
          image: updatedUser.profilePic || "",
        });
      } catch (error) {
        console.log("Error updating Stream user during onboarding:", error);
        // Continue despite Stream error
      }
  
      res.status(200).json({
        success: true,
        message: "Onboarding completed successfully",
        user: updatedUser
      });
    } catch (error) {
      console.log("Error in onboarding controller:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }