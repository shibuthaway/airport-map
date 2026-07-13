import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../../store/useMapStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiUser, FiArrowRight, FiLoader, FiRefreshCw, FiShield } from 'react-icons/fi';

// ── Canvas Math CAPTCHA ────────────────────────────────────────────────────────
function MathCaptcha({ onVerify }) {
  const canvasRef = useRef(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [answer, setAnswer] = useState(null);
  const [verified, setVerified] = useState(false);
  const [shake, setShake] = useState(false);

  const generateCaptcha = useCallback(() => {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, correctAnswer;

    if (op === '+') {
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * 20) + 5;
      correctAnswer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 20) + 15;
      b = Math.floor(Math.random() * 10) + 1;
      correctAnswer = a - b;
    } else {
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      correctAnswer = a * b;
    }

    setAnswer(correctAnswer);
    setUserAnswer('');
    setVerified(false);
    onVerify(false);

    // Draw on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.clearRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, W, H, 12);
    ctx.fill();

    // Noise dots
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * W, Math.random() * H,
        Math.random() * 2,
        0, Math.PI * 2
      );
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100 + 100)},${Math.floor(Math.random() * 100 + 100)},255,${Math.random() * 0.4 + 0.1})`;
      ctx.fill();
    }

    // Noise lines
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * W, Math.random() * H);
      ctx.lineTo(Math.random() * W, Math.random() * H);
      ctx.strokeStyle = `rgba(100,150,255,${Math.random() * 0.2 + 0.05})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw math text with slight rotation per char
    const text = `${a}  ${op}  ${b}  =  ?`;
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = text.split('');
    const totalW = chars.length * 16;
    let x = W / 2 - totalW / 2;

    chars.forEach((ch) => {
      ctx.save();
      const angle = (Math.random() - 0.5) * 0.3;
      ctx.translate(x + 8, H / 2 + (Math.random() - 0.5) * 4);
      ctx.rotate(angle);

      // Shadow
      ctx.shadowColor = 'rgba(14,165,233,0.6)';
      ctx.shadowBlur = 8;

      // Gradient per char
      const charGrad = ctx.createLinearGradient(0, -14, 0, 14);
      charGrad.addColorStop(0, '#38bdf8');
      charGrad.addColorStop(1, '#818cf8');
      ctx.fillStyle = charGrad;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      x += 16;
    });
  }, [onVerify]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const checkAnswer = (val) => {
    setUserAnswer(val);
    if (val === '') return;
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num === answer) {
        setVerified(true);
        onVerify(true);
      } else if (val.length >= String(answer).length) {
        setShake(true);
        setVerified(false);
        onVerify(false);
        setTimeout(() => { setShake(false); }, 500);
      }
    }
  };

  const refresh = () => {
    generateCaptcha();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <FiShield className="text-sky-400 flex-shrink-0" size={13} />
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security Check</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Canvas */}
        <div className="relative flex-1">
          <canvas
            ref={canvasRef}
            width={220}
            height={56}
            className="w-full rounded-xl border border-slate-700/60"
            style={{ imageRendering: 'crisp-edges' }}
          />
          {verified && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)', backdropFilter: 'blur(2px)' }}
            >
              <span className="text-emerald-400 font-black text-sm flex items-center gap-1">✓ Verified</span>
            </motion.div>
          )}
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={refresh}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-sky-400 transition-all active:scale-90 flex-shrink-0"
          title="New CAPTCHA"
        >
          <FiRefreshCw size={14} />
        </button>
      </div>

      {/* Answer Input */}
      <motion.div
        animate={shake ? { x: [-6, 6, -4, 4, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <input
          type="number"
          value={userAnswer}
          onChange={e => checkAnswer(e.target.value)}
          placeholder="Type the answer here"
          autoComplete="off"
          disabled={verified}
          className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all
            ${verified
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-950/50 border-slate-700 text-white focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500'
            }`}
        />
      </motion.div>
    </div>
  );
}

// ── Login Form ─────────────────────────────────────────────────────────────────
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  // Track failed attempts for rate-limiting feedback
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const navigate = useNavigate();

  const isLocked = lockedUntil && Date.now() < lockedUntil;
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (!isLocked) return;
    const iv = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        clearInterval(iv);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [isLocked, lockedUntil]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!captchaOk) {
      setError('Please complete the security check first.');
      return;
    }
    if (isLocked) return;

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
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        // Lock for 30s after 5 failed attempts
        if (newAttempts >= 5) {
          setLockedUntil(Date.now() + 30_000);
          setLockCountdown(30);
          throw new Error('Too many failed attempts. Locked for 30 seconds.');
        }
        throw new Error(data.error || 'Invalid credentials');
      }

      // Save token and state
      localStorage.setItem('ap_token', data.token);
      useMapStore.setState({ user: data.user, token: data.token, isAdminMode: true });

      if (data.user.role === 'superadmin') {
        navigate('/superadmin', { replace: true });
      } else {
        navigate(`/?project=${data.user.project_id}&mode=admin`, { replace: true });
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-violet-500/5 blur-[80px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
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
          {/* Username */}
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
              autoComplete="username"
              disabled={isLocked}
              className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all disabled:opacity-50"
            />
          </div>

          {/* Password */}
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
              autoComplete="current-password"
              disabled={isLocked}
              className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all disabled:opacity-50"
            />
          </div>

          {/* ── CAPTCHA ── */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4">
            <MathCaptcha onVerify={setCaptchaOk} />
          </div>

          {/* Attempts indicator */}
          {attempts > 0 && attempts < 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[11px] text-amber-400"
            >
              <span>⚠️</span>
              <span>{5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining before lockout</span>
            </motion.div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Locked state */}
          {isLocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-3 px-4 bg-rose-950/30 border border-rose-500/30 rounded-xl"
            >
              <p className="text-rose-400 font-bold text-sm">🔒 Account temporarily locked</p>
              <p className="text-rose-300/70 text-xs mt-1">Try again in <span className="font-black text-rose-400">{lockCountdown}s</span></p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked || !captchaOk}
            className="w-full mt-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <FiLoader className="animate-spin text-xl" /> : (
              <><FiArrowRight /> Sign In</>
            )}
          </button>

          {/* Security badge */}
          <p className="text-center text-[10px] text-slate-600 flex items-center justify-center gap-1">
            <FiShield size={10} />
            Protected by Math CAPTCHA + brute-force lockout
          </p>
        </form>
      </motion.div>
    </div>
  );
}
