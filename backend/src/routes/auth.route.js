import express from "express";
import { signup, login, logout } from "../controllers/auth.controller.js"; // ✅ import all functions

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
