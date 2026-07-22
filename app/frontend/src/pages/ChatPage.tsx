import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api';
import { Send, Plus, MessageSquare, ChevronLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Ref for auto-scrolling to the bottom
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentChatId) loadMessages(currentChatId);
    else setMessages([]);
  }, [currentChatId]);

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const { data } = await api.get('/chat');
      setSessions(data);
    } catch (err) { console.error("Failed to load chronicles"); }
  };

  const loadMessages = async (id: string) => {
    try {
      const { data } = await api.get(`/chat/${id}`);
      setMessages(data);
    } catch (err) { console.error("Failed to load history"); }
  };

  const sendMessage = async () => {
    if (!input || loading) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data } = await api.post('/chat', { message: userMessage, chatId: currentChatId });
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      
      if (!currentChatId) {
        setCurrentChatId(data.chatId);
        loadSessions();
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Connection lost. The Coach could not hear you." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-slate-900/50 flex flex-col p-4 hidden md:flex">
        <button 
          onClick={() => setCurrentChatId(null)}
          className="flex items-center gap-2 w-full p-3 border border-dashed border-slate-700 rounded-xl hover:bg-slate-800 transition-all text-xs font-bold mb-6 text-blue-400"
        >
          <Plus size={16} /> NEW SESSION
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-1">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2 mb-2">Past Chronicles</p>
          {sessions.map(s => (
            <button 
              key={s.id}
              onClick={() => setCurrentChatId(s.id)}
              className={`w-full text-left p-3 rounded-xl text-xs flex items-center gap-3 transition-all truncate ${
                currentChatId === s.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-white/5 text-slate-500'
              }`}
            >
              <MessageSquare size={14} /> 
              <span className="truncate">{new Date(s.updatedAt).toLocaleDateString()} Briefing</span>
            </button>
          ))}
        </div>
      </aside>

      {/* CHAT AREA */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <header className="px-5 py-2 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
            <Link to="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors"><ChevronLeft size={20}/></Link>
            <div className="text-center">
              <span className="text-sm font-bold text-slate-300">AI Productivity Coach</span>
            </div>
            <div className="w-10"></div>
        </header>

        {/* MESSAGES BOX */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto w-full">
            {messages.map((m, i) => (
              <div key={i} className={`mb-8 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${
                    m.role === 'user'
                      ? 'p-5 rounded-2xl shadow-2xl bg-blue-600 text-white max-w-[70%] rounded-tr-none'
                      : 'max-w-[90%] text-slate-200 pl-2'
                  }`}>

                  {/* MARKDOWN RENDERING ENGINE */}
<div className="prose prose-invert max-w-none font-ubuntu text-[16px] prose-p:leading-relaxed prose-headings:font-orbitron prose-pre:font-ubuntu prose-code:font-ubuntu prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start mb-8">
                <div className="bg-slate-900/50 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                  <Loader2 className="animate-spin text-blue-500" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transmitting Data...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* INPUT BAR */}
        <div className="px-6 py-3 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={loading}
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-5 pr-16 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all backdrop-blur-xl disabled:opacity-50"
              placeholder={loading ? "Coach is thinking..." : "Report your progress or set a goal..."}
            />
            <button 
              onClick={sendMessage}
              disabled={loading || !input}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 p-3 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 disabled:opacity-0 disabled:scale-90"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-[8px] text-slate-600 mt-4 uppercase tracking-[0.2em]">Neural Link Stable // Sin of Solace</p>
        </div>
      </main>
    </div>
  );
}