import { DataTypes } from "sequelize";
import sequelize from "../db/sequelize.js";

// Define the model using the shared sequelize instance
const Auth = sequelize.define(
  "auth",
  {
    user_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  },
  {
    tableName: "AUTH",
  }
);

export default Auth;

