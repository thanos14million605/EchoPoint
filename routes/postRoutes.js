import express from "express";

import postController from "./../controllers/postController.js";
import authController from "../controllers/authController.js";
import commentRouter from "./commentRoutes.js";

const router = express.Router();

router.use("/:postId", commentRouter);

router.use(authController.protectRoute);

router
  .route("/")
  .post(postController.createPost)
  .get(postController.getAllPosts)
  .delete(postController.deletePost);

router
  .route("/:postId")
  .get(postController.getPost)
  .patch(postController.updatePost)
  .delete(postController.deletePost);

export default router;
