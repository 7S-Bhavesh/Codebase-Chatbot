import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

console.log("\nChecking environment variables...\n");

const requiredVars = [
  "PORT",
  "JWT_SECRET",
  "POSTGRES_USERNAME",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB_NAME",
];

const optionalVars = ["FRONTEND_URL"];

let hasErrors = false;
const envFile = join(__dirname, ".env");


if (!existsSync(envFile)) {
  console.error(".env file not found in this folder.");
  console.error("\nCreate a .env file with these variables:\n");
  console.log("PORT=5000");
  console.log("JWT_SECRET=your-secret-key-here");
  console.log("POSTGRES_USERNAME=your-username");
  console.log("POSTGRES_PASSWORD=your-password");
  console.log("POSTGRES_DB_NAME=your-database-name");
  console.log("FRONTEND_URL=http://localhost:3000\n");
  process.exit(1);
}

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.error(`Missing: ${varName}`);
    hasErrors = true;
  } else {
    const displayValue =
      varName.includes("PASSWORD") || varName === "JWT_SECRET"
        ? "*".repeat(Math.min(value.length, 10))
        : value;
    console.log(`${varName.padEnd(25)} = ${displayValue}`);
  }
});


optionalVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`${varName.padEnd(25)} = ${value} (optional)`);
  } else {
    console.log(`${varName.padEnd(25)} = not set (optional, using default)`);
  }
});

if (hasErrors) {
  console.error("\nSome required environment variables are missing.");
  console.error("Please set them in your .env file.\n");
  process.exit(1);
}

console.log("\nAll required environment variables are set.\n");
