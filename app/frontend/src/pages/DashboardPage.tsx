import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Zap, Trophy, Plus, LogOut, Target, ListChecks } from 'lucide-react';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  // Use a fallback object so it doesn't crash on first render
  const [userData, setUserData] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : { username: 'Operative', level: 1, xp: 0 };
  });
  const [sortBy, setSortBy] = useState<'category' | 'xp' | 'recent'>('recent');
  const navigate = useNavigate();

  // 1. SYNC USER DATA (The "Aura Refresher")
  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me'); 
      setUserData(data);
      localStorage.setItem('user', JSON.stringify(data));
      console.log("📊 Stats Synced:", data);
    } catch (err) {
      console.error("Failed to sync user stats. Backend is yapping.");
    }
  };

  // 2. FETCH QUESTS
  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchTasks();
    fetchUser();
  }, [navigate]);

  const completeQuest = async (id: string) => {
  try {
    await api.post(`/tasks/${id}/complete`);

    setTasks(prev =>
      prev.map(task => {
        // If it's the main task
        if (task.id === id) {
          return { ...task, status: 'COMPLETED' };
        }

        // If it's inside subtasks
        if (task.subTasks) {
          return {
            ...task,
            subTasks: task.subTasks.map((sub: any) =>
              sub.id === id
                ? { ...sub, status: 'COMPLETED' }
                : sub
            )
          };
        }

        return task;
      })
    );

    await fetchUser();
    } catch (err) {
      console.error("Quest completion failed. Skill issue.");
    }
  };

  // --- LOGIC: TODAY'S CATEGORIZED MISSIONS ---
  const todayCategories = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = tasks.filter(t => t.createdAt.startsWith(today));

    if (sortBy === 'xp') {
      todaysTasks.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    } else if (sortBy === 'recent') {
      todaysTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return todaysTasks.reduce((acc: any, task: any) => {
      const cat = task.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(task);
      return acc;
    }, {});
  }, [tasks, sortBy]);

  const allCategories = useMemo(() => {
    return tasks.reduce((acc: any, task: any) => {
      const cat = task.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const scrollStyle = "overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-600 transition-all";

  return (
    <div className="flex h-screen bg-rpg-background overflow-hidden text-slate-200 font-['Ubuntu']">
      
      {/* SIDEBAR */}
      <nav className="w-20 md:w-64 border-r border-white/5 flex flex-col p-4 bg-rpg-element/90 shrink-0">
        <div className="text-blue-500 font-black text-2xl mb-10 px-4 italic tracking-tighter cursor-default">S|S</div>
        <div className="space-y-2 flex-1">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active />
          <Link to="/chat"><NavItem icon={<MessageSquare size={20}/>} label="Coach" /></Link>
        </div>
        <button onClick={() => {localStorage.clear(); navigate('/login');}} className="flex items-center gap-4 p-4 rounded-xl text-slate-500 hover:text-red-400 transition-all font-bold text-[10px] uppercase">
          <LogOut size={18} /> <span className="hidden md:block">Log Off</span>
        </button>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER - DYNAMIC STATS */}
        <header className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-rpg-element shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Quest Log</h2>
            <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest italic">user: {userData.username}</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="flex items-center gap-2 text-yellow-500 font-black text-[14px] mb-1 justify-end uppercase tracking-widest">
                <Trophy size={12} /> RANK {userData.level || 1}
              </div>
              <div className="w-44 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 shadow-[0_0_15px_#3b82f6] transition-all duration-700 ease-out" 
                  style={{ width: `${userData.xp}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5 font-black uppercase tracking-tighter">
                {userData.xp}/100 XP TO NEXT RANK
              </p>
            </div>
          </div>
        </header>

        {/* SPLIT PANES */}
        <div className="flex flex-1 overflow-hidden p-6 gap-6">
          {/* LEFT: TODAY'S GRIND */}
          <section className="w-full md:w-[50%] flex flex-col bg-rpg-element/70 border border-blue-500/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-rpg-element flex items-center justify-between">
              <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.4em] flex items-center gap-2"><Target size={18} /> Daily Grind</h3>
              <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="bg-slate-900 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 outline-none hover:border-blue-500/50 transition-all">
                <option value="recent">Recent</option>
                <option value="xp">High XP</option>
              </select>
            </div>
            <div className={`flex-1 p-6 space-y-8 ${scrollStyle}`}>
              {Object.keys(todayCategories).length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] uppercase font-black text-slate-800 tracking-[0.3em]">No Spawns Detected</div>
              ) : (
                Object.keys(todayCategories).map(cat => (
                  <div key={cat} className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] flex items-center gap-2 italic">{cat}</h4>
                    <div className="grid gap-4">
                      {todayCategories[cat].map((task: any) => (
                        <TaskCard key={task.id} task={task} onComplete={completeQuest} large />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* RIGHT: MASTER SCROLL */}
          <section className="hidden md:flex flex-col flex-1 bg-rpg-element/70 border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-rpg-element">
              <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.4em] flex items-center gap-2"><ListChecks size={18} /> Master Scroll</h3>
            </div>
            <div className={`flex-1 p-6 space-y-10 ${scrollStyle}`}>
              {Object.keys(allCategories).map(cat => (
                <div key={cat} className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-300 uppercase tracking-widest pl-3 border-l border-blue-300">{cat}</h4>
                  <div className="grid gap-3">
                    {allCategories[cat].map((task: any) => (
                      <TaskCard key={task.id} task={task} onComplete={completeQuest} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onComplete, large = false }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isComp = task.status === 'COMPLETED';
  const hasSubTasks = task.subTasks && task.subTasks.length > 0;
  const isBigTask = task.type === 'EPIC' || task.type === 'WEEKLY';
  const completedCount = hasSubTasks
  ? task.subTasks.filter((s: any) => s.status === 'COMPLETED').length
  : 0;

const totalCount = hasSubTasks ? task.subTasks.length : 0;

  return (
    <div className="space-y-2">
      {/* MAIN TASK */}
      <div className={`group flex items-center justify-between transition-all ${large ? 'p-6 bg-slate-900/80' : 'p-4 bg-slate-900/70'} border border-white/5 rounded-2xl hover:border-blue-500/40 shadow-lg`}>
        <div className="flex items-center gap-5">
          {/* Collapse/Expand Arrow for Big Tasks */}
          {isBigTask && hasSubTasks ? (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-500 hover:text-blue-400 transition-colors">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          ) : (
            <div className={`shrink-0 rounded-full ${large ? 'w-2 h-2' : 'w-1.5 h-1.5'} ${isComp ? 'bg-slate-700' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`}></div>
          )}
          
          <div>
            <h4 className={`font-bold leading-tight ${large ? 'text-xl' : 'text-base'} ${isComp ? 'text-slate-600 line-through' : 'text-white'}`}>
              {task.title}
            </h4>
            <div className="flex gap-3 items-center mt-2">
               <span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.1em]">{task.type}</span>
               {hasSubTasks && <span className="text-[10px] text-yellow-500/50 font-black italic">{task.subTasks.filter((s:any) => s.status === 'COMPLETED').length}/{task.subTasks.length} SUBS</span>}
            </div>
          </div>
        </div>

        {/* Claim button only shows if NO subtasks OR if it's a small task */}
        {!isComp && (!hasSubTasks || !isBigTask) && (
          <button onClick={() => onComplete(task.id)} className="px-6 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl font-black text-[10px] hover:bg-blue-600 hover:text-white transition-all uppercase">
            Claim
          </button>
        )}
        {hasSubTasks && isBigTask && (
          <div className="px-6 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl font-black text-[10px] uppercase">
            {completedCount} / {totalCount}
          </div>
        )}
        
      </div>

      {/* SUB-TASKS LIST */}
      {isExpanded && hasSubTasks && (
        <div className="ml-10 space-y-2 border-l-2 border-blue-300/40 pl-6 pb-4 animate-in slide-in-from-top-2 duration-300">
          {task.subTasks.map((sub: any) => (
            <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-900/60 border border-white/5 rounded-xl group/sub">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={14} className={sub.status === 'COMPLETED' ? 'text-blue-500' : 'text-slate-700'} />
                <span className={`text-base font-bold ${sub.status === 'COMPLETED' ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                  {sub.title}
                </span>
              </div>
              {sub.status !== 'COMPLETED' && (
                <button 
                  onClick={() => onComplete(sub.id)}
                  className="px-3 py-1 text-[9px] font-black uppercase border border-blue-500/40 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                >
                  Done
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false }: any) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
      {icon} <span className="hidden md:block font-bold text-xs uppercase tracking-[0.1em]">{label}</span>
    </div>
  );
}