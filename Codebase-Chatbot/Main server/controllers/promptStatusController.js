import Prompt from "../models/promptModel.js";
import { promptState } from '../util/promptState.js';

export async function getPromptStatus(req, res) {
  try {
    const prompt = await Prompt.findByPk(req.params.prompt_id);

    if (!prompt) {
      return res.status(404).json({ status: "not_found" });
    }

    const status = promptState(prompt);
    if (status === 'processing') {
      return res.json({ status: "processing", stage: prompt.stage, prompt_id: prompt.prompt_id });
    }

    // Return answer + new metadata fields so the frontend can render
    // source citations and low-confidence badges.
    res.json({
      status,
      prompt_id: prompt.prompt_id,
      stage: prompt.stage,
      error_code: prompt.error_code,
      response:       prompt.response,
      sources:        prompt.sources        ?? [],
      low_confidence: prompt.low_confidence ?? false,
    });
  } catch (err) {
    console.error("Prompt status error:", err);
    res.status(500).json({ status: "error" });
  }
}
