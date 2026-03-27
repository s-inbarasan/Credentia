import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, RefreshCw, Trash2, Edit2, MessageSquare, Plus, MoreVertical, Check, Copy } from 'lucide-react';
import { Logo } from './Logo';
import { Toaster, toast } from 'sonner';
import { Message, ChatSession } from '../types';
import { getCyberResponse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userUid?: string;
  chatSessions: ChatSession[];
  onSessionUpdate: (session: ChatSession) => void;
  onSessionDelete: (sessionId: string) => void;
  onMessageSent?: (text: string) => void;
}

export function ChatPanel({ isOpen, onClose, userUid, chatSessions, onSessionUpdate, onSessionDelete, onMessageSent }: ChatPanelProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0];

  // Filter out empty chats for the history list
  const filteredSessions = chatSessions.filter(s => s.messages.some(m => m.role === 'user'));

  useEffect(() => {
    if (isOpen && chatSessions.length === 0) {
      handleNewChat();
    } else if (isOpen && !activeSessionId && chatSessions.length > 0) {
      setActiveSessionId(chatSessions[0].id);
    }
  }, [isOpen, chatSessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length, isTyping]);

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSessionId]);

  const handleNewChat = () => {
    // Check if there's already an empty chat in the list
    const emptyChat = chatSessions.find(s => !s.messages.some(m => m.role === 'user'));
    if (emptyChat) {
      setActiveSessionId(emptyChat.id);
      setShowHistory(false);
      return;
    }

    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [{
        id: '1',
        role: 'ai',
        text: "Hello! I am CREDENTIA AI Mentor. How can I help secure your digital life today?",
        timestamp: new Date().toISOString()
      }],
      updatedAt: new Date().toISOString()
    };
    onSessionUpdate(newSession);
    setActiveSessionId(newSession.id);
    setShowHistory(false);
  };

  const handleSendMessage = async (regenerateText?: string) => {
    const messageText = regenerateText || input.trim();
    if (!messageText || !activeSession) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    let updatedMessages = activeSession.messages || [];
    if (!regenerateText) {
      updatedMessages = [...updatedMessages, userMsg];
    } else {
      // If regenerating, remove the last AI message if it exists
      if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === 'ai') {
        updatedMessages = updatedMessages.slice(0, -1);
      }
    }

    let newTitle = activeSession.title;
    // Auto-generate title from first message
    if (updatedMessages.length === 1 && !regenerateText) {
      const firstMsg = messageText;
      newTitle = firstMsg.length > 40 ? firstMsg.slice(0, 37) + '...' : firstMsg;
    }

    const updatedSession = { ...activeSession, messages: updatedMessages, title: newTitle, updatedAt: new Date().toISOString() };
    onSessionUpdate(updatedSession);
    
    if (!regenerateText) setInput('');
    setIsTyping(true);

    try {
      const history = updatedMessages.map(m => ({
        role: m.role === 'ai' ? 'model' as const : 'user' as const,
        parts: [{ text: m.text }]
      }));

      const responseText = await getCyberResponse(messageText, history.slice(0, -1));

      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'ai',
        text: responseText,
        timestamp: new Date().toISOString()
      };

      // Simulate streaming effect
      setStreamingMessageId(aiMsgId);
      setIsTyping(false);
      
      let currentText = '';
      const words = responseText.split(' ');
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        setStreamingText(currentText);
        await new Promise(resolve => setTimeout(resolve, 30)); // Adjust speed as needed
      }

      const finalSession = { ...updatedSession, messages: [...updatedMessages, aiMsg], updatedAt: new Date().toISOString() };
      onSessionUpdate(finalSession);
      setStreamingMessageId(null);
      setStreamingText('');
      
      if (onMessageSent && !regenerateText) {
        onMessageSent(messageText);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setIsTyping(false);
      toast.error('Failed to get response from AI Mentor');
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      onSessionUpdate({ ...session, title: newTitle, updatedAt: new Date().toISOString() });
    }
    setEditingSessionId(null);
  };

  const confirmDelete = () => {
    if (deletingSessionId) {
      onSessionDelete(deletingSessionId);
      if (activeSessionId === deletingSessionId) {
        const remaining = chatSessions.filter(s => s.id !== deletingSessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDeletingSessionId(null);
      toast.success('Chat deleted');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-cyber-bg border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-cyber-card/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyber-blue/20 flex items-center justify-center border border-cyber-blue/50">
                  <Logo size="sm" glow variant="ai" />
                </div>
                <div>
                  <h2 className="font-bold text-white">AI Mentor</h2>
                  <p className="text-xs text-cyber-blue flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyber-blue animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden flex">
              {/* Chat History Sidebar (Slide over) */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    className="absolute inset-0 bg-cyber-bg z-20 flex flex-col border-r border-white/10"
                  >
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <h3 className="font-bold">Chat History</h3>
                      <button 
                        onClick={handleNewChat}
                        className="p-2 bg-cyber-blue/20 text-cyber-blue rounded-lg hover:bg-cyber-blue/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      <AnimatePresence initial={false}>
                        {filteredSessions.map(session => (
                          <motion.div 
                            key={session.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              if (editingSessionId === session.id) return;
                              setActiveSessionId(session.id);
                              setShowHistory(false);
                            }}
                            className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group relative transition-all duration-200 ${activeSessionId === session.id ? 'bg-cyber-blue/10 border border-cyber-blue/30' : 'hover:bg-white/5 border border-transparent'}`}
                          >
                            <div className="flex-1 min-w-0">
                              {editingSessionId === session.id ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editingTitle}
                                    onChange={e => setEditingTitle(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleRename(session.id, editingTitle);
                                      if (e.key === 'Escape') setEditingSessionId(null);
                                    }}
                                    className="bg-black/40 border border-cyber-blue/50 rounded px-2 py-1 text-sm w-full focus:outline-none"
                                  />
                                  <button onClick={() => handleRename(session.id, editingTitle)} className="text-cyber-green hover:scale-110 transition-transform shrink-0">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingSessionId(null)} className="text-cyber-red hover:scale-110 transition-transform shrink-0">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="truncate">
                                  <p className="text-sm font-medium truncate">{session.title}</p>
                                  <p className="text-xs text-white/40">{new Date(session.updatedAt).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className={`shrink-0 flex items-center gap-1 transition-opacity z-10 ${activeSessionId === session.id ? 'opacity-100' : 'opacity-100 group-hover:opacity-100'}`}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === session.id ? null : session.id);
                                }}
                                className="p-2 text-white hover:bg-white/10 rounded-lg transition-all"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {activeMenuId === session.id && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)} />
                                  <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute right-2 top-full mt-1 w-32 bg-cyber-card border border-white/10 rounded-lg shadow-xl z-40 overflow-hidden"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        setEditingSessionId(session.id);
                                        setEditingTitle(session.title);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2 transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      Rename
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeletingSessionId(session.id);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-cyber-red hover:bg-cyber-red/10 flex items-center gap-2 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {filteredSessions.length === 0 && (
                        <div className="text-center p-8 text-white/40 text-sm">
                          No saved chats
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {(activeSession?.messages || []).map((msg, idx) => {
                  const isLast = idx === (activeSession?.messages?.length || 0) - 1;
                  const isStreaming = streamingMessageId === msg.id;
                  const displayText = isStreaming ? streamingText : msg.text;

                  return (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-cyber-purple/20 border border-cyber-purple/50' : 'bg-cyber-blue/20 border border-cyber-blue/50'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4 text-cyber-purple" /> : <Logo size="sm" variant="ai" />}
                      </div>
                      <div className="max-w-[85%] space-y-2">
                        <div className={`rounded-2xl p-4 ${msg.role === 'user' ? 'bg-cyber-purple/20 border border-cyber-purple/30 rounded-tr-none' : 'bg-cyber-card border border-white/10 rounded-tl-none'}`}>
                          {msg.role === 'ai' ? (
                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                              <ReactMarkdown>{displayText}</ReactMarkdown>
                              {isStreaming && <span className="inline-block w-1.5 h-4 bg-cyber-blue ml-1 animate-pulse align-middle" />}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          )}
                        </div>
                        
                        {/* Message Actions */}
                        {!isStreaming && (
                          <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <button 
                              onClick={() => copyToClipboard(msg.text)}
                              className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                              title="Copy message"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {msg.role === 'ai' && (
                              <button 
                                onClick={() => {
                                  const lastUserMsg = [...(activeSession?.messages || [])].reverse().find(m => m.role === 'user');
                                  if (lastUserMsg) handleSendMessage(lastUserMsg.text);
                                }}
                                className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                                title="Regenerate response"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                
                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyber-blue/20 border border-cyber-blue/50 flex items-center justify-center shrink-0">
                      <Logo size="sm" variant="ai" />
                    </div>
                    <div className="bg-cyber-card border border-white/10 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {deletingSessionId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setDeletingSessionId(null)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-sm bg-cyber-bg border border-white/10 rounded-2xl p-6 shadow-2xl"
                  >
                    <div className="w-12 h-12 rounded-full bg-cyber-red/20 flex items-center justify-center mb-4 mx-auto">
                      <Trash2 className="w-6 h-6 text-cyber-red" />
                    </div>
                    <h3 className="text-xl font-bold text-center mb-2">Delete Chat?</h3>
                    <p className="text-white/60 text-center text-sm mb-6">
                      This action cannot be undone. All messages in this conversation will be permanently removed.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeletingSessionId(null)}
                        className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmDelete}
                        className="flex-1 py-3 rounded-xl bg-cyber-red text-white hover:bg-cyber-red/90 transition-colors font-medium"
                      >
                        Delete Chat
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-cyber-card/50 backdrop-blur-md">
              <div className="relative flex items-end gap-2">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask about cybersecurity..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-cyber-blue/50 resize-none min-h-[50px] max-h-[150px]"
                  rows={1}
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="p-3 bg-cyber-blue text-black rounded-xl hover:bg-cyber-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-center text-white/30 mt-2">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
