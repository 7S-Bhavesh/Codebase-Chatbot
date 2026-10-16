import Prompt from "../models/promptModel.js";
import Chat from "../models/chatModel.js";
import RepoInput from "../models/repoInputModel.js";
import { generation } from "../util/ragOutput.js";

export async function savePrompt(req, res) {
  try {
    let { chat_id, prompt, repo_id } = req.body;

    if (!chat_id || !prompt) {
      return res.status(400).json({ error: "Chat ID and prompt are required" });
    }

    // If -1 → create new chat
    if (chat_id === -1) {
      const newChat = await Chat.create({ repo_id });
      chat_id = newChat.chat_id;
    }

    const newPrompt = await Prompt.create({
      chat_id,
      prompt,
      response: null,
      sources: null,
      low_confidence: null,
    });

    // Respond to frontend immediately (fire-and-forget pattern preserved)
    res.status(201).json({
      message: "Prompt received. Processing...",
      prompt_id: newPrompt.prompt_id,
      chat_id: chat_id,
      status: "processing",
    });

    // Background job: run generation AFTER the HTTP response is sent
    process.nextTick(async () => {
      try {
        const repoData = await RepoInput.findOne({ where: { repo_id } });

        if (!repoData) {
          console.error(`[promptController] repo_id ${repo_id} not found`);
          return;
        }

        // Pass repo_id (integer) as the primary Weaviate filter.
        // email + repo_url are passed for backward-compat fallback in ragOutput.js.
        const result = await generation(
          prompt,
          repoData.email,
          repoData.repo_url,
          repoData.repo_id,   // ← new: integer FK
        );

        await Prompt.update(
          {
            response:       result.answer  ?? result.error ?? "Error generating response",
            sources:        result.sources ?? null,
            low_confidence: result.low_confidence ?? null,
          },
          { where: { prompt_id: newPrompt.prompt_id } }
        );

        console.log("[promptController] LLM generation finished for prompt:", newPrompt.prompt_id);

      } catch (err) {
        console.error("[promptController] Background generation error:", err);
      }
    });

  } catch (err) {
    console.error("Save prompt error:", err);
    res.status(500).json({ error: "Failed to save prompt" });
  }
}


export async function getPrompts(req, res) {
  try {
    const chat_id = req.params.chat_id;
    const prompts = await Prompt.findAll({ where: { chat_id: chat_id } });
    if (!prompts) {
      return res.status(404).json({ error: "Prompts not found" });
    }
    res.status(200).json(prompts);
  } catch (err) {
    console.error("Get prompts error:", err);
    res.status(500).json({ error: "Failed to get prompts" });
  }
}