import { DataTypes } from "sequelize";
import sequelize from "../db/sequelize.js";

// Define the model using the shared sequelize instance
const Chat = sequelize.define(
  "chatModel",
  {
    chat_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    chat_title: {
      type: DataTypes.STRING,
    },
    repo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "REPO_INPUT",
            key: "repo_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,   
    },
  },
  {
    tableName: "CHAT",
    timestamps: false
  }
);

export default Chat;
