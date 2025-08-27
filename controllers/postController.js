import pool from "../db/db.js";
import asyncHandler from "./../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import apiFeatures from "../utils/apiFeatures.js";

const { applyFieldLimiting, applyFiltering, applySorting, applyPagination } =
  apiFeatures;

const createPost = asyncHandler(async (req, res, next) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return next(new AppError("Title and content are required.", 400));
  }

  const { id, name } = req.user;

  const client = await pool.connect();

  await client.query("BEGIN");

  const newPost = await client.query(
    "INSERT INTO posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING id, title, content, created_at",
    [id, title, content]
  );

  const {
    id: newPostId,
    title: newPostTitle,
    content: newPostContent,
    created_at,
  } = newPost.rows[0];

  await client.query("COMMIT");

  client.release();

  res.status(201).json({
    status: "success",
    data: {
      id: newPostId,
      title: newPostTitle,
      content: newPostContent,
      author: name,
      created_at,
    },
  });
});

const getAllPosts = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const selectedFields = applyFieldLimiting(req.query);
  console.log(selectedFields);

  const { whereByClause, values } = applyFiltering(req.query);
  console.log(whereByClause, values);

  const limitClause = applyPagination(req.query);
  console.log(limitClause);

  const orderByClause = applySorting(req.query);
  console.log(orderByClause);

  let selectQuery = "";
  if (selectedFields) {
    selectQuery = `SELECT ${selectedFields}, posts.id, posts.title, posts.content, posts.created_at, users.name AS author`;
  }

  selectQuery = `SELECT posts.id, posts.title, posts.content, posts.created_at, users.name AS author`;

  const sql = `
    ${selectQuery}
    FROM posts 
    JOIN users ON posts.user_id = users.id
    ${whereByClause}
    ${orderByClause} 
    ${limitClause}
  `;

  const posts = await client.query(sql, values);

  //   console.log(posts.rows);
  if (posts.rows.length === 0) {
    return next(new AppError("No matching records.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    results: posts.rows.length,
    data: {
      posts: posts.rows,
    },
  });
});

const getPost = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const posts = await client.query(
    `SELECT posts.id, posts.title, posts.content, posts.created_at, users.name, users.email 
     FROM posts 
     JOIN users ON posts.user_id = users.id
     WHERE posts.id = $1`,

    [postId]
  );

  if (posts.rows.length === 0) {
    return next(new AppError("Post not found.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      post: posts.rows[0],
    },
  });
});

const updatePost = asyncHandler(async (req, res, next) => {
  const { title, content } = req.body;
  if (!title && !content) {
    return next(new AppError("At least one field is required.", 400));
  }

  const { postId } = req.params;
  const client = await pool.connect();
  req.pgClient = client;

  const post = await client.query("SELECT * FROM posts WHERE id = $1", [
    postId,
  ]);
  if (post.rows.length === 0) {
    return next(new AppError("Post not found.", 404));
  }

  const updatedTitle = title || post.rows[0].title;
  const updatedContent = content || post.rows[0].content;

  const updatedPost = await client.query(
    "UPDATE posts SET title = $1, content = $2 WHERE id = $3 RETURNING *",
    [updatedTitle, updatedContent, postId]
  );

  if (updatedPost.rows.length === 0) {
    return next(new AppError("Couldn't update post. Try again later.", 500));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      post: updatedPost.rows[0],
    },
  });
});

const deletePost = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const { id: userId } = req.user;

  const client = await pool.connect();
  req.pgClient = client;

  const deletedPost = await client.query(
    "DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *",
    [postId, userId]
  );

  if (deletedPost.rows.length === 0) {
    return next(new AppError("Post not found.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export default { createPost, getAllPosts, getPost, updatePost, deletePost };
