import dotenv from "dotenv";

import pool from "./db/db.js";
import app from "./app.js";

dotenv.config({
  path: "./config.env",
  debug: false,
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception. Shutting down gracefully 🔥.");
  console.log("Uncaught Error", err);
  process.exit(1);
});

pool
  .query("SELECT NOW()")
  .then((result) => console.log("DB connection made at", result.rows[0].now))
  .catch((err) => console.log("DB connection failed.", err));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`App is running on PORT ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection. Shutting down gracefully 🔥.");
  console.log("Unhandled Error", err);
  server.close(() => {
    process.exit(1);
  });
});
