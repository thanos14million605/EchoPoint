import dotenv from "dotenv";
dotenv.config({
  path: "./../config.env",
});

import pool from "../db/db.js";
import asyncHandler from "./../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import bcryptHelper from "../utils/bcryptHelper.js";
import apiFeatures from "../utils/apiFeatures.js";

const { applyFieldLimiting, applyFiltering, applySorting, applyPagination } =
  apiFeatures;

const getMe = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const me = await client.query("SELECT * FROM users WHERE id = $1", [id]);
  if (me.rows.length === 0) {
    return next(new AppError("User not found."));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      me: me.rows[0],
    },
  });
});

const updateMe = asyncHandler(async (req, res, next) => {
  const { name } = req.body;
  if (!name) {
    return next(
      new AppError("At least one of the two fields is required.", 400)
    );
  }

  const { id, email } = req.user;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");
  const user = await client.query("SELECT * FROM users WHERE id = $1", [id]);

  if (name === user.rows[0].name) {
    return next(
      new AppError(
        "New user name must be different from current user name.",
        400
      )
    );
  }

  const updatedName = name ?? user.rows[0].name;
  const updatedUser = await client.query(
    "UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email",
    [updatedName, id]
  );

  if (updatedUser.rows.length === 0) {
    return next(
      new AppError("Could not update your name. Please try again later.", 500)
    );
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      id,
      name,
      email,
    },
  });
});

const updateMyPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword, newPasswordConfirm } = req.body;
  if (!oldPassword || !newPassword || !newPasswordConfirm) {
    return next(new AppError("All fields are required.", 400));
  }

  if (newPassword !== newPasswordConfirm) {
    return next(new AppError("Passwords do not match.", 400));
  }

  if (oldPassword === newPassword) {
    return next(
      new AppError("New password must be different from current password.", 400)
    );
  }

  const { id, name, email } = req.user;
  const hashedPassword = await bcryptHelper.bcryptHash(newPassword);

  const updatedUser = await client.query(
    "UPDATE users SET password = $1 WHERE id = $2 RETURNING *",
    [hashedPassword, id]
  );

  if (updatedUser.rows.length === 0) {
    return next(
      new AppError(
        "Could not update your password. Please try again later.",
        500
      )
    );
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      id,
      name,
      email,
    },
  });
});

const deleteMe = asyncHandler(async (req, res, next) => {
  const { confirmEmail, confirmPassword } = req.body;
  if (!confirmEmail || !confirmPassword) {
    return next(new AppError("Both fields are required.", 400));
  }

  const { id } = req.user;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const user = await client.query(
    "SELECT * FROM users WHERE id = $1 AND email = $2",
    [id, confirmEmail]
  );
  if (!user) {
    return next(new AppError("Invalid email or password.", 401));
  }

  const { password } = user.rows[0];

  const isMatch = await bcryptHelper.bcryptCompare(confirmPassword, password);
  if (!isMatch) {
    return next(new AppError("Invalid email or password.", 401));
  }

  const deactivatedUser = await client.query(
    "UPDATE users SET isActive = $1 WHERE id = $2 RETURNING *",
    [false, id]
  );

  if (deactivatedUser.rows.length === 0) {
    return next(new AppError("Sorry, we couldn't delete your account.", 400));
  }

  await client.query("COMMIT");
  client.release();

  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });

  res.status(200).json({
    status: "success",
    message: "Account deleted successfully. You can recover within 30 days.",
  });
});

// To be implemented later
const reActivateMe = asyncHandler(async (req, res, next) => {});

// Only for admin
const deleteUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const user = await client.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);

  if (user.rows.length === 0) {
    return next(new AppError("This user doesn't exist.", 404));
  }

  const deactivatedUser = await client.query(
    "UPDATE users SET isActive = $1 WHERE id = $2 RETURNING *",
    [false, userId]
  );

  if (deactivatedUser.rows.length === 0) {
    return next(
      new AppError("Sorry, we couldn't delete this user's account.", 400)
    );
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    message: "User deleted successfully.",
  });
});

const getAllUsers = asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const selectedFields = applyFieldLimiting(req.query);

  const { whereByClause, values } = applyFiltering(req.query);

  const limitClause = applyPagination(req.query);

  const orderByClause = applySorting(req.query);

  const sql = `
    SELECT ${selectedFields}
    FROM users 
    ${whereByClause}
    ${orderByClause} 
    ${limitClause}
  `;

  const users = await client.query(sql, values);

  if (users.rows.length === 0) {
    return next(new AppError("No matching records.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    results: users.rows.length,
    data: {
      users: users.rows,
    },
  });
});

const getUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const users = await client.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);

  if (users.rows.length === 0) {
    return next(new AppError("User not found.", 404));
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    data: {
      user: users.rows[0],
    },
  });
});

export default {
  getMe,
  updateMe,
  deleteMe,
  updateMyPassword,
  deleteUser,
  getAllUsers,
  getUser,
};
