import Prompt from "../models/promptModel.js";

export async function getPromptStatus(req, res) {
  try {
    const prompt = await Prompt.findByPk(req.params.prompt_id);

    if (!prompt) {
      return res.status(404).json({ status: "not_found" });
    }

    if (!prompt.response) {
      return res.json({ status: "processing" });
    }

    res.json({
      status: "done",
      response: prompt.response,
    });
  } catch (err) {
    console.error("Prompt status error:", err);
    res.status(500).json({ status: "error" });
  }
}
