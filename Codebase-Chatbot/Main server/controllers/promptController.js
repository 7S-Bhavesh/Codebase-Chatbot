import Prompt from "../models/promptModel.js";
import Chat from "../models/chatModel.js";
import RepoInput from "../models/repoInputModel.js";
//import Auth from "../models/authModel.js";
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
    });

    // Respond to frontend 
    res.status(201).json({
      message: "Prompt received. Processing...",
      prompt_id: newPrompt.prompt_id,
      chat_id: chat_id,
      status: "processing",
    });

    //  Background job: run generation AFTER response
    process.nextTick(async () => {
      try {
        const repoData = await RepoInput.findOne({ where: { repo_id } });

        const answer = await generation(
          prompt,
          repoData.email,
          repoData.repo_url
        );

        await Prompt.update(
          { response: answer.answer },
          { where: { prompt_id: newPrompt.prompt_id } }
        );

        console.log("LLM generation finished for prompt:", newPrompt.prompt_id);

      } catch (err) {
        console.error("Background generation error:", err);
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
    //console.log(prompts);
    res.status(200).json(prompts);
  } catch (err) {
    console.error("Get prompts error:", err);
    res.status(500).json({ error: "Failed to get prompts" });
  }
}