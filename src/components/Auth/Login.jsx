import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../../store/useMapStore';
import { motion } from 'framer-motion';
import { FiLock, FiUser, FiArrowRight, FiLoader } from 'react-icons/fi';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    const token = localStorage.getItem('ap_token');
    const user = useMapStore.getState().user;
    if (token) {
      if (user?.role === 'superadmin') {
        navigate('/superadmin');
      } else if (user?.project_id) {
        navigate(`/?project=${user.project_id}&mode=admin`);
      } else {
        // Fallback to home
        navigate('/');
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save token and state
      localStorage.setItem('ap_token', data.token);
      useMapStore.setState({ user: data.user, token: data.token, isAdminMode: true });

      // Redirect based on role
      if (data.user.role === 'superadmin') {
        navigate('/superadmin');
      } else {
        // Automatically load their project without full reload
        navigate(`/?project=${data.user.project_id}&mode=admin`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <FiLock className="text-3xl text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Admin Portal</h1>
          <p className="text-sm text-slate-400">Sign in to manage your maps and routes.</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiUser className="text-slate-500" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiLock className="text-slate-500" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
          >
            {loading ? <FiLoader className="animate-spin text-xl" /> : (
              <>Sign In <FiArrowRight /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
