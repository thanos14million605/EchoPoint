import pool from "../db/db.js";
import asyncHandler from "./../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

const createComment = asyncHandler(async (req, res, next) => {
  // Every comment must be related to a specific user and post
  // It will be wise I use mergeParams for this.
  // route: /api/v1/posts/postId/comments

  const { content } = req.body;
  if (!content) {
    return next(new AppError("Comment content is required.", 400));
  }

  const { id: user_id, name: author } = req.user;
  const { postId: post_id } = req.params;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const newComment = await client.query(
    "INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *",
    [post_id, user_id, content]
  );

  if (newComment.rows.length === 0) {
    return next(
      new AppError("Couldn't create comment. Please try again.", 500)
    );
  }

  const { id: newCommentId, created_at } = newComment.rows[0];

  await client.query("COMMIT");
  client.release();

  res.status(201).json({
    status: "success",
    data: {
      id: newCommentId,
      post_id,
      author,
      content,
      created_at,
    },
  });
});

const getComment = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;
  const { postId } = req.params;

  if (!commentId) {
    return next(new AppError("Comment not found.", 404));
  }

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const comment = await client.query(
    `SELECT comments.id, comments.post_id, comments.content, users.name as author 
    FROM comments 
    JOIN users ON comments.user_id = users.id
    WHERE comments.id = $1 AND comments.post_id = $2
    `,
    [commentId, postId]
  );

  if (comment.rows.length === 0) {
    return next(new AppError("Comment not found.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      comment: comment.rows[0],
    },
  });
});

const getAllComments = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const comments = await client.query(
    `SELECT comments.id, comments.post_id, comments.content, users.name as author 
    FROM comments 
    JOIN users ON comments.user_id = users.id
    WHERE comments.post_id = $1
    `,
    [postId]
  );

  if (comments.rows.length === 0) {
    return next(new AppError("No comments found.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    results: comments.rows.length,
    data: {
      comments: comments.rows,
    },
  });
});

const updateComment = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  const { commentId, postId } = req.params;

  if (!content || !commentId || !postId) {
    return next(new AppError("Content is required.", 400));
  }

  const client = await pool.connect();
  req.pgClient = client;
  const { id: userId, name: author } = req.user;

  await client.query("BEGIN");

  console.log(commentId, postId, userId);

  const updatedComment = await client.query(
    `UPDATE comments SET content = $1 
    WHERE id = $2 AND post_id = $3 AND user_id = $4
    RETURNING *
    `,
    [content, commentId, postId, userId]
  );

  if (updatedComment.rows.length === 0) {
    return next(new AppError("Comment not found.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      id: commentId,
      post_id: postId,
      user_id: userId,
      author,
      content,
    },
  });
});

const deleteComment = asyncHandler(async (req, res, next) => {
  const { postId, commentId } = req.params;
  const { id: userId } = req.user;

  const client = await pool.connect();
  req.pgClient = client;

  const deletedComment = await client.query(
    "DELETE FROM comments WHERE id = $1 AND user_id = $2 AND post_id = $3 RETURNING *",
    [commentId, userId, postId]
  );

  if (deletedComment.rows.length === 0) {
    return next(new AppError("Post not found.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export default {
  createComment,
  getAllComments,
  getComment,
  updateComment,
  deleteComment,
};
