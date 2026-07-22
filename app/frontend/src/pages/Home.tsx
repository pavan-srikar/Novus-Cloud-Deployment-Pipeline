import React, { useState } from 'react';

export default function Home() {
  const [user, setUser] = useState({ level: 5, xp: 65, username: "Hero" });
  const [tasks, setTasks] = useState([
    { id: 1, title: "Morning Code Session", type: "DAILY", status: "PENDING" },
    { id: 2, title: "Weekly Gym Goal", type: "WEEKLY", status: "COMPLETED" }
  ]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Header / Stats */}
      <div className="flex justify-between items-center mb-10 bg-slate-800 p-6 rounded-xl border-b-4 border-yellow-500">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest">{user.username}</h1>
          <p className="text-yellow-400 font-mono">Rank: Productivity Knight</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold">LVL {user.level}</span>
          {/* XP Bar using Tailwind */}
          <div className="w-64 h-4 bg-gray-700 rounded-full mt-2 overflow-hidden border border-gray-600">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500" 
              style={{ width: `${user.xp}%` }}
            />
          </div>
          <p className="text-xs mt-1 text-gray-400">{user.xp} / 100 XP</p>
        </div>
      </div>

      {/* Quest Log */}
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">⚔️</span> ACTIVE QUESTS
      </h2>
      <div className="grid gap-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center hover:bg-slate-700 transition cursor-pointer border-l-4 border-blue-500">
            <div>
              <p className="font-bold">{task.title}</p>
              <span className="text-xs px-2 py-1 bg-blue-900 rounded text-blue-300">{task.type}</span>
            </div>
            <button className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold text-sm">
              COMPLETE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}