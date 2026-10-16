import Prompt from "../models/promptModel.js";
import Chat from "../models/chatModel.js";
import RepoInput from "../models/repoInputModel.js";
import { generation } from "../util/ragOutput.js";
import { promptState } from '../util/promptState.js';

export async function savePrompt(req, res) {
  try {
    let { chat_id, prompt, repo_id } = req.body;

    if (!chat_id || !prompt) {
      return res.status(400).json({ error: "Chat ID and prompt are required" });
    }

    if (chat_id !== -1) {
      const chat = await Chat.findByPk(chat_id);
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
      repo_id = chat.repo_id;
    }
    const repoData = await RepoInput.findByPk(repo_id);
    if (!repoData) return res.status(404).json({ error: 'Repository not found' });
    if (repoData.email !== req.user.email) return res.status(403).json({ error: 'Repository access denied' });

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
      status: 'processing',
      stage: 'queued',
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
      const started = Date.now();
      console.log(`[prompt:${newPrompt.prompt_id}] accepted repo=${repo_id} chat=${chat_id}`);
      try {
        // Pass repo_id (integer) as the primary Weaviate filter.
        // email + repo_url are passed for backward-compat fallback in ragOutput.js.
        const result = await generation(
          prompt,
          repoData.email,
          repoData.repo_url,
          repoData.repo_id,   // ← new: integer FK
          {},
          async stage => {
            console.log(`[prompt:${newPrompt.prompt_id}] stage=${stage} elapsedMs=${Date.now() - started}`);
            await Prompt.update({ stage }, { where: { prompt_id: newPrompt.prompt_id } });
          },
          { promptId: newPrompt.prompt_id, chatId: chat_id },
        );

        await Prompt.update(
          {
            response:       result.answer  ?? result.error ?? "Error generating response",
            sources:        result.sources ?? null,
            low_confidence: result.low_confidence ?? null,
            status: result.success ? 'done' : 'failed',
            stage: result.success ? 'complete' : result.stage,
            error_code: result.error_code ?? null,
          },
          { where: { prompt_id: newPrompt.prompt_id } }
        );

        console.log(`[prompt:${newPrompt.prompt_id}] status=${result.success ? 'done' : 'failed'} code=${result.error_code || 'none'} elapsedMs=${Date.now() - started}`);

      } catch (err) {
        console.error("[promptController] Background generation error:", err);
        await Prompt.update(
          { status: 'failed', error_code: 'PROCESSING_FAILED', response: 'Could not generate an answer. Please try again.' },
          { where: { prompt_id: newPrompt.prompt_id } }
        ).catch(updateError => console.error('Could not persist prompt failure:', updateError.message));
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
    const prompts = await Prompt.findAll({ where: { chat_id: chat_id }, order: [['prompt_id', 'ASC']] });
    if (!prompts) {
      return res.status(404).json({ error: "Prompts not found" });
    }
    res.status(200).json(prompts.map(prompt => ({ ...prompt.toJSON(), status: promptState(prompt) })));
  } catch (err) {
    console.error("Get prompts error:", err);
    res.status(500).json({ error: "Failed to get prompts" });
  }
}
