import { DataTypes } from "sequelize";
import sequelize from "../db/sequelize.js";
import { response } from "express";

// Define the model using the shared sequelize instance
const Prompt = sequelize.define(
  "prompt",
  {
    prompt_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    chat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "CHAT",
        key: "chat_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    response: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "PROMPT",
  }
);

export default Prompt;

