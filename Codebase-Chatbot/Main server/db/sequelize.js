import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

if (
  !process.env.POSTGRES_DB_NAME ||
  !process.env.POSTGRES_USERNAME ||
  !process.env.POSTGRES_PASSWORD
) {
  throw new Error("Missing required PostgreSQL environment variables");
}

const sequelize = new Sequelize(
  process.env.POSTGRES_DB_NAME,
  process.env.POSTGRES_USERNAME,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST || "localhost",
    dialect: "postgres",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export async function connectSequelize() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    return sequelize;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
}

export default sequelize;
