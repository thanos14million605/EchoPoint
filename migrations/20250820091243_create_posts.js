import dotenv from "dotenv";
dotenv.config({
  path: "./../config.env",
});

import pool from "./../db/db.js";

const createPostsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const query = `
    CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    await client.query(query);
    await client.query("COMMIT");
    console.log("Posts table created successfully.");
  } catch (err) {
    console.log("Error in creating posts table.", err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

createPostsTable();
