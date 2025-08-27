import dotenv from "dotenv";
import { promisify } from "util";
dotenv.config({
  path: "./../config.env",
});

// console.log(process.env.JWT_SECRET);

import jwt from "jsonwebtoken";

const signToken = async (userId) => {
  return await jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_SECRET_EXPIRES_IN,
  });
};

const verifyToken = async (token) => {
  return await promisify(jwt.verify)(token, process.env.JWT_SECRET);
};

export default { signToken, verifyToken };
