import { DataTypes } from "sequelize";
import sequelize from "../db/sequelize.js";

// Define the model using the shared sequelize instance
const RepoInput = sequelize.define(
  "repoInput",
  {
    repo_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      // unique: true,
      allowNull: false,
    },
    repo_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,   
    },
  },
  {
    tableName: "REPO_INPUT",
    timestamps: false,
  }
);

export default RepoInput;
