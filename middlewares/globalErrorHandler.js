import dotenv from "dotenv";
dotenv.config({
  path: "./../config.env",
});
import AppError from "../utils/AppError.js";

const globalErrorHandler = async (err, req, res, _) => {
  console.log("Error in global error handler", err);

  err.statusCode ||= 500;
  err.status ||= "error";

  let customError = err;

  // console.log(req.pgClient);
  if (req.pgClient) {
    try {
      await req.pgClient.query("ROLLBACK");
      console.log("pgClient has ROLLBACKED the last transaction.");
    } catch (rollBackError) {
      console.log(
        "Error in globalErrorHandler: pgClient couldn't be ROLLBACKED",
        rollBackError
      );
    } finally {
      req?.pgClient?.release();
      req.pgClient = null;
    }
  }

  if (err.code) {
    switch (err.code) {
      case "23505": // unique_violation
        customError = new AppError(
          "Duplicate value violates unique constraint.",
          409
        );
        break;

      case "23503": // foreign_key_violation
        customError = new AppError(
          "Invalid reference. Related record not found.",
          400
        );
        break;

      case "22P02":
        // invalid input syntax (like UUID issue)
        customError = new AppError(
          "Invalid UUID format. Please provide a valid UUID.",
          400
        );
        break;

      case "23502": // not_null_violation
        customError = new AppError(
          `Missing required field: ${err.column}`,
          400
        );
        break;

      case "22P02": // invalid_text_representation
        customError = new AppError("Invalid input syntax.", 400);
        break;

      case "42703": // undefined_column
        customError = new AppError("Invalid column in query.", 400);
        break;

      case "42P01": // undefined_table
        customError = new AppError("Invalid table in query.", 500);
        break;

      case "42601": // syntax_error
        customError = new AppError("SQL syntax error.", 500);
        break;

      case "42883": // undefined_function
        customError = new AppError("Invalid SQL function/operator.", 500);
        break;

      case "40001": // serialization_failure
        customError = new AppError(
          "Transaction failed due to concurrency. Please retry.",
          503
        );
        break;

      case "40P01": // deadlock_detected
        customError = new AppError("Deadlock detected. Please retry.", 503);
        break;

      case "22012": // division_by_zero
        customError = new AppError("Division by zero error.", 400);
        break;

      case "22001": // string_data_right_truncation
        customError = new AppError("Input string too long for column.", 400);
        break;

      case "22003": // numeric_value_out_of_range
        customError = new AppError("Number out of range for column type.", 400);
        break;

      default:
        customError = new AppError("Some unknown error occurred.", 500);
        break;
    }
  }

  if (err.name === "JsonWebTokenError") {
    customError = new AppError("Invalid token. Please log in.", 401);
  }

  if (err.name === "TokenExpiredError") {
    customError = new AppError("Token has expired. Please log in again.", 401);
  }

  if (process.env.NODE_ENV === "development") {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      err,
    });
  }

  if (process.env.NODE_ENV === "production") {
    res.status(customError.statusCode || 500).json({
      status: customError.status,
      message: !customError.isOperational
        ? "Something went wrong"
        : customError.message,
    });
  }
};

export default globalErrorHandler;
