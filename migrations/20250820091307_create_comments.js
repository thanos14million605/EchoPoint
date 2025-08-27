import dotenv from "dotenv";
dotenv.config({
  path: "./../config.env",
});

import pool from "./../db/db.js";

const createCommentsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const query = `
    CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    await client.query(query);
    await client.query("COMMIT");
    console.log("Comments table created successfully.");
  } catch (err) {
    console.log("Error in creating comments table.", err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

createCommentsTable();
