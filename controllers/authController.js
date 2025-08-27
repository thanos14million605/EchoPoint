import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config({
  path: "./../config.env",
});
import validator from "validator";

import bcryptHelper from "../utils/bcryptHelper.js";
import jwtHelper from "../utils/jwtHelper.js";
import sendEmail from "../utils/email.js";
import pool from "./../db/db.js";
import asyncHandler from "./../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import generateOTP from "../utils/otpGenerator.js";

const signup = asyncHandler(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  if (!name || !email || !password || !passwordConfirm) {
    return next(new AppError("All fields are required.", 400));
  }

  const client = await pool.connect();
  req.pgClient = client;

  const isExistingUser = await client.query(
    "SELECT email from users WHERE email = $1",
    [email]
  );

  // console.log(isExistingUser);

  if (isExistingUser.rows.length > 0) {
    return next(new AppError("User already exists. Please sign in.", 400));
  }

  const isValidEmail = validator.isEmail(email);
  if (!isValidEmail) {
    return next(new AppError("Please enter a valid email.", 400));
  }

  if (password.length < 6) {
    return next(new AppError("Password must be at least 6 characters.", 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match.", 400));
  }

  await client.query("BEGIN");
  const { otp } = generateOTP();

  const hashedPassword = await bcryptHelper.bcryptHash(password);

  const newUser = await client.query(
    "INSERT INTO users (name, email, password, otp, otpExpiresAt) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email",
    [name, email, hashedPassword, otp, new Date(Date.now() + 15 * 60 * 1000)]
  );

  try {
    const subject = "Email Verification OTP - EchoPoint";
    const message = `Your email verification OTP is ${otp}. This otp will expire in 15 minutes.`;

    const options = {
      to: email,
      subject,
      message,
    };

    await sendEmail(options);
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("Error in signup: Couldn't send email verification OTP", err);
    return next(
      new AppError("Sorry, we couldn't sign you up. Try again later.", 500)
    );
  }

  await client.query("COMMIT");
  client.release();

  res.status(201).json({
    status: "success",
    message:
      "Sign up successful. Please check your email for verification OTP.",
    data: {
      user: newUser.rows[0],
    },
  });
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("All fields are required.", 400));
  }

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const user = await client.query(
    "SELECT id, name, isactive, isemailverified, password FROM users WHERE email = $1",
    [email]
  );
  if (user.rows.length === 0) {
    return next(new AppError("Invalid email or password. Invalid email.", 401));
  }

  const candidatePassword = password;

  const {
    id,
    name,
    isactive,
    isemailverified,
    password: actualPassword,
  } = user.rows[0];

  if (!isactive) {
    return next(new AppError("Invalid email or password. Not active", 401));
  }

  if (!isemailverified) {
    return next(
      new AppError("Invalid email or password. Email verification", 401)
    );
  }

  const isMatch = await bcryptHelper.bcryptCompare(
    candidatePassword,
    actualPassword
  );
  if (!isMatch) {
    return next(
      new AppError("Invalid email or password. Not matching password.", 401)
    );
  }

  // Generate token
  const jwt = await jwtHelper.signToken(id);

  // Add to res
  res.cookie("jwt", jwt, {
    httpOnly: true,
    maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
  });

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    jwt,
    data: {
      id,
      name,
      email,
    },
  });
});

const verifyEmail = asyncHandler(async (req, res, next) => {
  const { email, candidateOtp } = req.body;
  if (!email || !candidateOtp) {
    return next(new AppError("All fields are required.", 400));
  }

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const user = await client.query(
    "SELECT id, email, otp, otpExpiresAt FROM users WHERE email = $1",
    [email]
  );

  if (user.rows.length === 0) {
    return next(new AppError("Invalid or expired OTP", 400));
  }

  const { id, otp, otpexpiresat } = user.rows[0];
  if (otp !== candidateOtp || Date.now() > otpexpiresat.getTime()) {
    return next(new AppError("Invalid or expired OTP", 400));
  }

  await client.query(
    "UPDATE users SET otp = $1, otpexpiresat = $2, isemailverified = $3 WHERE id = $4",
    [null, null, true, id]
  );

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    message: "Email verified successfully. Please sign in.",
  });
});

const resendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError("Email is required.", 400));
  }

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");
  const user = await client.query(
    "SELECT id, isemailverified, email FROM users WHERE email = $1",
    [email]
  );

  if (user.rows.length === 0) {
    return next(new AppError("Unregistered user. Please sign up.", 400));
  }

  const { id, isemailverified } = user.rows[0];
  if (isemailverified) {
    return next(new AppError("Email already verified. Please sign in.", 400));
  }

  const { otp } = generateOTP();

  await client.query(
    "UPDATE users SET otp = $1, otpexpiresat = $2 WHERE id = $3 AND email = $4",
    [otp, new Date(Date.now() + 15 * 60 * 1000), id, email]
  );

  try {
    const subject = "New Verification OTP - EchoPoint";
    const message = `Your email verification OTP is ${otp}. This otp will expire in 15 minutes.`;

    const options = {
      to: email,
      subject,
      message,
    };

    await sendEmail(options);
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(
      "Error in resending OTP: Couldn't send email verification OTP",
      err
    );
    return next(
      new AppError("Sorry, we couldn't send you OTP. Try again later.", 500)
    );
  }

  await client.query("COMMIT");
  client.release();

  res.status(201).json({
    status: "success",
    message: "We've sent you the requested OTP. Please check your email.",
  });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError("Email is required.", 400));
  }

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const user = await client.query(
    "SELECT id, passwordResetToken, passwordResetTokenExpiresAt FROM users WHERE email = $1",
    [email]
  );

  if (user.rows.length === 0) {
    return next(new AppError("Unregistered user. Please sign up.", 400));
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const encryptedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  await client.query(
    "UPDATE users SET passwordResetToken = $1, passwordResetTokenExpiresAt = $2",
    [encryptedToken, new Date(Date.now() + 15 * 60 * 1000)]
  );

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/reset-password/${resetToken}`;

  try {
    const subject = "Password Reset Token -- EchoPoint";

    const message = `Your password reset token is ${resetURL}. This token will expire in 15 minutes.`;

    const options = {
      to: email,
      subject,
      message,
    };

    await sendEmail(options);
  } catch (err) {
    console.log("Error in sending password reset token.", err);
    await client.query("ROLLBACK");
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    message: "Password reset token has been successfully sent to your email.",
  });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { resetToken } = req.params;
  const { email, newPassword, newPasswordConfirm } = req.body;
  if (!email || !newPassword || !newPasswordConfirm) {
    return next(new AppError("All fields is required.", 400));
  }

  if (newPassword !== newPasswordConfirm) {
    return next(new AppError("Passwords do not match.", 400));
  }
  const encryptedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const client = await pool.connect();
  req.pgClient = client;

  await client.query("BEGIN");

  const user = await client.query(
    "SELECT * FROM users WHERE email = $1 AND passwordResetToken = $2",
    [email, encryptedToken]
  );

  if (user.rows.length === 0) {
    return next(
      new AppError("Reset token has expired or some error has occurred.", 400)
    );
  }

  const { id, passwordresettoken, passwordresettokenexpiresat } = user.rows[0];
  if (
    passwordresettoken !== encryptedToken ||
    (passwordresettokenexpiresat &&
      Date.now() > passwordresettokenexpiresat?.getTime())
  ) {
    return next(new AppError("Expired or invalid reset token.", 400));
  }

  const hashedPassword = await bcryptHelper.bcryptHash(newPassword);

  const updatedUser = await client.query(
    "UPDATE users SET passwordResetToken = $1, passwordResetTokenExpiresAt = $2, password = $3 WHERE id = $4 AND email = $5 RETURNING id, name, email",
    [null, null, hashedPassword, id, email]
  );

  if (updatedUser.rows.length === 0) {
    return next(
      new AppError("Could not update your password. Try again later.", 500)
    );
  }

  await client.query("COMMIT");
  client.release();

  res.status(200).json({
    status: "success",
    message: "New password created successfully. Please sign in.",
  });
});

// Transfer protect and restrict to middlewares folder
const protectRoute = asyncHandler(async (req, _, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("Token not found. Please log in again.", 401));
  }

  const client = await pool.connect();
  req.pgClient = client;
  await client.query("BEGIN");

  const decoded = await jwtHelper.verifyToken(token);

  const user = await client.query(
    "SELECT id, name, email, passwordchangedat, role FROM users WHERE id = $1",
    [decoded.id]
  );

  if (user.rows.length === 0) {
    return next(
      new AppError("User belonging to this token does not exist.", 401)
    );
  }

  // check if user has changed their password.
  const { passwordchangedat } = user.rows[0];
  if (passwordchangedat && Date.parse(passwordchangedat) > decoded.iat * 1000) {
    return next(
      new AppError(
        "Password changed recently. Please sign in again for security reasons.",
        401
      )
    );
  }

  const { id, name, email, role } = user.rows[0];
  req.user = { id, name, email, role };

  await client.query("COMMIT");
  client.release();

  next();
});

const restrictTo = (...roles) => {
  return (req, _, next) => {
    const { role } = req.user;

    if (!roles.includes(role)) {
      req.pgClient = null;
      return next(new AppError("Forbidden. Access denied.", 403));
    }

    next();
  };
};

export default {
  signup,
  login,
  protectRoute,
  restrictTo,
  resendOTP,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
