import { DataTypes } from "sequelize";
import sequelize from "../db/sequelize.js";

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
    // ── New fields added for the upgraded RAG pipeline ──────────────────────
    /**
     * JSON array of source objects returned by the pipeline.
     * Shape: [{ file_path, start_line, end_line, unit_id, signature, inherited }]
     * Stored as JSONB for efficient querying; null for older rows.
     */
    sources: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    /**
     * True when the top reranker score was below ABS_FLOOR at query time.
     * Surfaced in the polling response so the frontend can show a warning badge.
     */
    low_confidence: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "PROMPT",
  }
);

export default Prompt;
