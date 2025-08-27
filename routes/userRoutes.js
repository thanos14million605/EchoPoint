import express from "express";

import authController from "../controllers/authController.js";
import userController from "./../controllers/userController.js";

const router = express.Router();

router.use(authController.protectRoute);

router.get("/me", userController.getMe);
router.patch("/update-me", userController.updateMe);
router.patch("/update-my-password", userController.updateMyPassword);
router.delete("/delete-me", userController.deleteMe);

router
  .route("/user/:userId")
  .get(authController.restrictTo("admin"), userController.getUser)
  .delete(authController.restrictTo("admin"), userController.deleteUser);

router.get(
  "/all-users",
  authController.restrictTo("admin"),
  userController.getAllUsers
);

export default router;
