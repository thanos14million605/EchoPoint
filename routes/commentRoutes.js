import express from "express";
import authController from "../controllers/authController.js";
import commentController from "./../controllers/commentController.js";

const router = express.Router({
  mergeParams: true,
});

router.use(authController.protectRoute);

router
  .route("/comments")
  .post(commentController.createComment)
  .get(commentController.getAllComments);

router
  .route("/comments/:commentId")
  .get(commentController.getComment)
  .patch(commentController.updateComment)
  .delete(commentController.deleteComment);

export default router;
