import express from "express";

import authController from "../controllers/authController.js";

const router = express.Router();

router.patch("/reset-password/:resetToken", authController.resetPassword);

router.post("/verify-email", authController.verifyEmail);

router.post("/signup", authController.signup);

router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);

router.post("/resend-otp", authController.resendOTP);

export default router;
