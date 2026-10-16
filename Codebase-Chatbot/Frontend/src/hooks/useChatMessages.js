import { useEffect, useRef, useState } from 'react';
import { promptAPI } from '../services/api';

export function formatPrompts(prompts) {
  return prompts.flatMap(prompt => [
    { id: `prompt-${prompt.prompt_id}`, promptId: prompt.prompt_id, role: 'user', content: prompt.prompt },
    {
      id: `response-${prompt.prompt_id}`,
      promptId: prompt.prompt_id,
      role: 'assistant',
      content: prompt.response || 'Processing...',
      status: prompt.status || (prompt.response ? 'done' : 'processing'),
      stage: prompt.stage,
      error_code: prompt.error_code,
      sources: prompt.sources ?? [],
      low_confidence: prompt.low_confidence ?? false,
    },
  ]);
}

export function useChatMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const revision = useRef(0);
  const previousChat = useRef(chatId);
  const acceptedChat = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    if (previousChat.current !== chatId && acceptedChat.current !== chatId) setMessages([]);
    acceptedChat.current = null;
    previousChat.current = chatId;
    setHistoryError('');
    if (!chatId || chatId === -1) {
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);

    async function poll() {
      const requestRevision = revision.current;
      try {
        const prompts = await promptAPI.getPrompts(chatId);
        if (cancelled || requestRevision !== revision.current) return;
        const next = formatPrompts(Array.isArray(prompts) ? prompts : []);
        // A slow history snapshot must not erase a prompt accepted just before it.
        setMessages(previous => {
          const received = new Set(next.map(message => message.promptId));
          const pending = new Set(previous.filter(message => message.status === 'processing').map(message => message.promptId));
          return [...next, ...previous.filter(message => pending.has(message.promptId) && !received.has(message.promptId))];
        });
        setHistoryError('');
        setLoadingHistory(false);
        // Continue while the chat is open, including accepted prompts missing
        // from an older server snapshot. Cleanup cancels this on chat changes.
        timer = setTimeout(poll, 2000);
      } catch (error) {
        if (cancelled) return;
        setLoadingHistory(false);
        setHistoryError('Could not refresh this chat. Reconnecting...');
        timer = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [chatId, refresh]);

  function addPending(prompt) {
    // Invalidate an older history request before adding the new prompt.
    revision.current += 1;
    setMessages(previous => [...previous, ...formatPrompts([prompt])]);
  }

  function acceptPrompt(temporaryId, prompt, savedChatId) {
    revision.current += 1;
    acceptedChat.current = savedChatId;
    setMessages(previous => [
      ...previous.filter(message => message.promptId !== temporaryId),
      ...formatPrompts([prompt]),
    ]);
    setRefresh(value => value + 1);
  }

  function failPending(temporaryId, error) {
    revision.current += 1;
    setMessages(previous => previous.map(message => message.promptId === temporaryId && message.role === 'assistant'
      ? { ...message, status: 'failed', content: error }
      : message));
  }

  return { messages, loadingHistory, historyError, addPending, acceptPrompt, failPending };
}
