import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import { useMapStore } from '../../store/useMapStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useMapStore();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 min-w-[300px] ${
              toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <div className="flex-shrink-0 text-xl">
              {toast.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
            </div>
            <div className="flex-1 text-sm font-bold">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <FiX />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
