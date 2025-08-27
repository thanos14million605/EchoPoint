import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
// import cors from "cors";

import globalErrorHandler from "./middlewares/globalErrorHandler.js";
import authRouter from "./routes/authRoutes.js";
import postsRouter from "./routes/postRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import userRouter from "./routes/userRoutes.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//   })
// );

// const allowedOrigins = ["http://localhost:5173"]; // whitelist

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // allow requests with no origin (like Postman, curl)
//       // Later remove this while in production
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     // credentials: true, // if you want cookies/auth headers
//   })
// );

app.use(cookieParser());

app.use((req, _, next) => {
  console.log("I'm a middleware.");
  console.log(req.originalUrl);
  next();
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/posts", postsRouter);

app.use(globalErrorHandler);

export default app;
