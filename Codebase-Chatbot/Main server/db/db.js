import pkg from "pg";
const { Pool } = pkg;

export default function connectDB() {
  const pool = new Pool({
    user: process.env.POSTGRES_USERNAME,
    host: "localhost",
    database: process.env.POSTGRES_DB_NAME,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  console.log("USER:", process.env.POSTGRES_USERNAME);
  console.log("PASS:", process.env.POSTGRES_PASSWORD);
  console.log("DB:", process.env.POSTGRES_DB_NAME);
  console.log("PORT:", process.env.PORT);

  if (!process.env.POSTGRES_USERNAME || !process.env.POSTGRES_PASSWORD || !process.env.POSTGRES_DB_NAME) {
    console.error("Missing Postgres env variables (POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_DB_NAME)");
  }

  pool
    .connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch((err) => console.error("Connection error", err));

  return pool;
}
