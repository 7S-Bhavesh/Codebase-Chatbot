import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI, promptAPI } from '../services/api';
import Navbar from '../components/Navbar';

export default function Chat() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  useEffect(() => {
    if (repoId) {
      loadChats();
    }
  }, [repoId]);

  useEffect(() => {
    if (activeChatId && activeChatId !== -1) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const data = await chatAPI.getAllChats(repoId);
      setChats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load chats:', error);
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async () => {
    if (!activeChatId || activeChatId === -1) return;
    try {
      const prompts = await promptAPI.getPrompts(activeChatId);
      if (Array.isArray(prompts)) {
        const formattedMessages = prompts.flatMap(prompt => [
          { id: `prompt-${prompt.prompt_id}`, role: 'user', content: prompt.prompt },
          ...(prompt.response ? [{ id: `response-${prompt.prompt_id}`, role: 'assistant', content: prompt.response }] : [])
        ]);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(-1); // -1 means new chat, will be created when first message is sent
    setMessages([]);
  };

  const handleChatClick = (chatId) => {
    setActiveChatId(chatId);
  };

  const pollPromptStatus = async (promptId, responseMessageId) => {
    try {
      const status = await promptAPI.getPromptStatus(promptId);
      
      if (status.status === 'done' && status.response) {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
        
        // Update the message with the response
        setMessages(prev => prev.map(msg => 
          msg.id === responseMessageId 
            ? { ...msg, content: status.response }
            : msg
        ));
        setLoading(false);
      } else if (status.status === 'processing') {
        // Keep polling, status is still processing
        return;
      } else if (status.status === 'error') {
        // Stop polling on error
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
        setMessages(prev => prev.map(msg => 
          msg.id === responseMessageId 
            ? { ...msg, content: 'Error generating response. Please try again.' }
            : msg
        ));
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to poll prompt status:', error);
      // Continue polling on network errors
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      const response = await promptAPI.savePrompt(
        activeChatId === -1 ? -1 : activeChatId,
        currentInput,
        parseInt(repoId)
      );

      // If new chat was created, update activeChatId
      if (activeChatId === -1 && response.chat_id) {
        setActiveChatId(response.chat_id);
        await loadChats();
      }

      // Add processing message immediately
      const responseMessageId = `response-${response.prompt_id}`;
      const processingMessage = {
        id: responseMessageId,
        role: 'assistant',
        content: 'Processing...',
      };
      setMessages(prev => [...prev, processingMessage]);

      // Start polling for the response
      const currentChatId = activeChatId === -1 ? response.chat_id : activeChatId;
      if (currentChatId) {
        setActiveChatId(currentChatId);
      }

      // Clear any existing polling interval and timeout
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }

      // Set a maximum polling duration (5 minutes)
      pollingTimeoutRef.current = setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setMessages(prev => prev.map(msg => 
          msg.id === responseMessageId 
            ? { ...msg, content: 'Request timed out. Please try again.' }
            : msg
        ));
        setLoading(false);
      }, 5 * 60 * 1000); // 5 minutes

      // Start polling every 2 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollPromptStatus(response.prompt_id, responseMessageId);
      }, 2000);

      // Initial poll immediately
      pollPromptStatus(response.prompt_id, responseMessageId);

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      alert(error.response?.data?.error || 'Failed to send message');
      setLoading(false);
      
      // Clear polling if it was started
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    }
  };

  const handleBackToRepos = () => {
    navigate('/repos');
  };

  return (
    <div className="min-h-screen bg-[#FDFBD4] text-[#38240D] flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#38240D]/10 flex flex-col">
          <div className="p-4 border-b border-[#38240D]/10">
            <button
              onClick={handleBackToRepos}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#713600] hover:text-[#C05800] hover:bg-[#FDFBD4] rounded-lg transition-colors mb-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Repos
            </button>
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-4 py-3 bg-[#C05800] hover:bg-[#713600] text-[#FDFBD4] rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loadingChats ? (
              <div className="text-center py-8 text-[#713600] text-sm">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8 text-[#713600] text-sm">
                <p>No chats yet</p>
                <p className="mt-2">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chats.map((chat) => (
                  <button
                    key={chat.chat_id}
                    onClick={() => handleChatClick(chat.chat_id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeChatId === chat.chat_id
                        ? 'bg-[#C05800] text-[#FDFBD4]'
                        : 'text-[#713600] hover:bg-[#FDFBD4] hover:text-[#C05800]'
                    }`}
                  >
                    <div className="truncate">
                      {chat.chat_title || `Chat ${chat.chat_id}`}
                    </div>
                    {chat.created_at && (
                      <div className="text-xs text-[#713600]/60 mt-1">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-[#FDFBD4]">
          {!activeChatId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[#713600]/50 mb-4">
                  <svg className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#38240D] mb-2">Start a new conversation</h2>
                <p className="text-[#713600] mb-6">Click "New Chat" to begin asking questions about your repository</p>
                <button
                  onClick={handleNewChat}
                  className="px-6 py-3 bg-[#C05800] hover:bg-[#713600] text-[#FDFBD4] rounded-lg font-medium transition-colors"
                >
                  New Chat
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-[#713600]">
                      <p className="text-lg mb-2">Start chatting</p>
                      <p className="text-sm">Ask questions about your codebase</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 max-w-3xl ${
                        message.role === 'user' ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`flex-1 rounded-xl p-4 ${
                          message.role === 'user'
                            ? 'bg-[#C05800] text-[#FDFBD4] ml-auto'
                            : 'bg-white border border-[#38240D]/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.role === 'user' ? 'bg-[#713600]' : 'bg-[#FDFBD4]'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium mb-1 text-sm">
                              {message.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            <div className={`whitespace-pre-wrap ${message.role === 'user' ? 'text-[#FDFBD4]' : 'text-[#38240D]'}`}>
                              {message.content === 'Processing...' ? (
                                <div className="flex items-center gap-2 text-[#713600]">
                                  <div className="w-2 h-2 bg-[#C05800] rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-[#C05800] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  <div className="w-2 h-2 bg-[#C05800] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                  <span className="ml-2">Processing...</span>
                                </div>
                              ) : (
                                message.content
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-[#38240D]/10 bg-white p-4">
                <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
                  <div className="flex gap-4">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Ask something about your codebase..."
                      rows="1"
                      className="flex-1 px-4 py-3 bg-[#FDFBD4] border-2 border-[#713600]/30 rounded-xl text-[#38240D] placeholder-[#713600]/50 focus:ring-2 focus:ring-[#C05800] focus:border-transparent resize-none text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="px-6 py-3 bg-[#C05800] hover:bg-[#713600] text-[#FDFBD4] rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}