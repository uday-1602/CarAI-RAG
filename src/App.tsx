import React, { useState, useEffect, useRef } from 'react';
import { Search, Car, Send, Loader2, Database, Info, ChevronRight, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { streamCarDetails } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSearching) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSearching(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true }]);

    try {
      // Generation Step (Streaming via Lambda Proxy)
      let fullContent = '';
      const streamer = streamCarDetails(input);

      for await (const chunk of streamer) {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
      ));
    } catch (error) {
      console.error('Streaming error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { 
          ...msg, 
          content: `**Error:** ${errorMessage}\n\nPlease ensure your Lambda function is active and the Knowledge Base ID is correct.`, 
          isStreaming: false 
        } : msg
      ));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Sidebar */}
      <aside className="w-80 border-r border-[#141414] flex flex-col bg-[#E4E3E0]">
        <div className="p-6 border-bottom border-[#141414]">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight uppercase">AutoSpec RAG</h1>
          </div>
          <p className="text-xs font-mono opacity-60 uppercase tracking-widest">Global Car Intelligence</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h2 className="text-[11px] font-serif italic uppercase opacity-50 mb-3 tracking-wider">System Status</h2>
            <div className="p-4 border border-[#141414] rounded-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-mono">Backend</span>
                <span className="text-[10px] font-bold bg-[#141414] text-[#E4E3E0] px-2 py-0.5">AWS LAMBDA</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-mono">Model</span>
                <span className="text-[10px] font-bold border border-[#141414] px-2 py-0.5">CLAUDE 3 HAIKU</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-serif italic uppercase opacity-50 mb-3 tracking-wider">Quick Guides</h2>
            <div className="space-y-2">
              {['Tesla Model 3 Specs', 'BMW M3 Evolution', 'Toyota Supra MK4', 'Porsche 911 GT3'].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="w-full text-left p-2 text-xs border-b border-[#141414]/10 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex justify-between items-center group"
                >
                  {q}
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-[#141414]">
          <div className="flex items-center gap-2 text-[10px] font-mono opacity-40">
            <Info className="w-3 h-3" />
            <span>POWERED BY BEDROCK KNOWLEDGE BASE</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-[#141414] flex items-center justify-between px-8 bg-[#E4E3E0]/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest">Live Connection</span>
          </div>
          <div className="flex items-center gap-6">
            <History className="w-4 h-4 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" />
            <div className="w-8 h-8 rounded-full border border-[#141414] flex items-center justify-center text-[10px] font-bold">
              UA
            </div>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 border border-[#141414] rounded-full flex items-center justify-center">
                <Car className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-serif italic mb-2">Welcome to AutoSpec</h3>
                <p className="text-sm opacity-60 leading-relaxed">
                  Connected to your AWS Bedrock Knowledge Base. Ask about any car brand, model, or specific technical details from your S3 datasheets.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="p-4 border border-[#141414] text-left space-y-2">
                  <span className="text-[10px] font-mono uppercase opacity-40">Example</span>
                  <p className="text-xs font-medium">"What are the specs of the 2024 Ferrari Purosangue?"</p>
                </div>
                <div className="p-4 border border-[#141414] text-left space-y-2">
                  <span className="text-[10px] font-mono uppercase opacity-40">Example</span>
                  <p className="text-xs font-medium">"Compare the range of Tesla Model S vs Lucid Air."</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-6 max-w-4xl",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "w-8 h-8 shrink-0 border border-[#141414] flex items-center justify-center text-[10px] font-bold",
                  msg.role === 'user' ? "bg-[#141414] text-[#E4E3E0]" : "bg-white"
                )}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={cn(
                  "flex-1 space-y-2",
                  msg.role === 'user' ? "text-right" : "text-left"
                )}>
                  <div className="text-[10px] font-mono uppercase opacity-40 tracking-widest">
                    {msg.role === 'user' ? 'User Request' : 'System Response'}
                  </div>
                  <div className={cn(
                    "prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic prose-headings:font-normal prose-table:border prose-table:border-[#141414] prose-th:bg-[#141414] prose-th:text-[#E4E3E0] prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-[#141414]",
                    msg.role === 'user' ? "inline-block p-4 border border-[#141414] bg-white" : ""
                  )}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-[#141414] ml-1 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 border-t border-[#141414] bg-[#E4E3E0]">
          <form 
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter car model or brand..."
              className="w-full bg-white border border-[#141414] p-4 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] placeholder:opacity-30"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSearching}
              className="absolute right-2 top-2 bottom-2 px-4 bg-[#141414] text-[#E4E3E0] disabled:opacity-50 transition-opacity flex items-center justify-center"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
          <p className="text-[10px] text-center mt-4 opacity-30 font-mono uppercase tracking-widest">
            Experimental RAG Pipeline • Data sourced from AWS Bedrock Knowledge Base
          </p>
        </div>
      </main>
    </div>
  );
}
