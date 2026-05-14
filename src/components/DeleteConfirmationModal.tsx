import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  title, 
  message, 
  onConfirm, 
  onCancel,
  isLoading = false
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden text-center border border-slate-100 transition-colors"
      >
        <div className="p-10 space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-xl flex items-center justify-center mx-auto text-red-500 shadow-sm border border-red-100">
            <AlertTriangle size={36} />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-[#1A1F2E] tracking-tight transition-colors">{title}</h2>
            <p className="text-[#64748B] font-medium leading-relaxed transition-colors">
              {message}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <button 
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full bg-[#1A1F2E] text-white py-5 rounded-xl font-bold hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : null}
              <span className="text-xs font-black uppercase tracking-widest">{isLoading ? 'Deleting...' : 'Confirm Termination'}</span>
            </button>
            <button 
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-5 rounded-xl font-bold text-[#64748B] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-sans"
            >
              <X size={18} />
              <span>Cancel Operation</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
