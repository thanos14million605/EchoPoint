import dotenv from "dotenv";
dotenv.config({
  path: "./../config.env",
});

import pool from "./../db/db.js";

const createUsersTable = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const query = `
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(250) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),

        isActive BOOLEAN DEFAULT TRUE,

        otp VARCHAR(6),
        otpExpiresAt TIMESTAMP,

        passwordResetToken VARCHAR(200),
        passwordResetTokenExpiresAt TIMESTAMP,

        passwordChangedAt TIMESTAMP,

        isEmailVerified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    await client.query(query);
    await client.query("COMMIT");
    console.log("Users table created successfully.");
  } catch (err) {
    console.log("Error in creating users table.", err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

createUsersTable();
