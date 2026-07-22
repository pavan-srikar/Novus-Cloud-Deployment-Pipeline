import { useState } from 'react';
import api from '../api';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = isLogin ? '/auth/login' : '/auth/register';
    
    try {
      const { data } = await api.post(path, { username, password });
      
      // Save session
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to Dashboard
      window.location.href = '/'; 
    } catch (err: any) {
      alert(err.response?.data?.error || "Connection to the Guild failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <h1 className="text-3xl font-black text-blue-500 mb-6 italic text-center uppercase tracking-widest">
          {isLogin ? 'Resume Quest' : 'New Hero Registry'}
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Identity</label>
            <input 
              type="text"
              required
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-all"
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Secret Key</label>
            <input 
              type="password"
              required
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-all"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 transform active:scale-95 transition-all">
            {isLogin ? 'ENTER REALM' : 'AWAKEN'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-slate-500 text-xs font-bold hover:text-blue-400 transition-colors"
        >
          {isLogin ? "DON'T HAVE AN IDENTITY? REGISTER" : "ALREADY A HERO? LOGIN"}
        </button>
      </div>
    </div>
  );
}