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
        className="absolute inset-0 bg-brand-primary/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-bg-sidebar rounded-[40px] shadow-2xl overflow-hidden text-center"
      >
        <div className="p-12 space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-[30px] flex items-center justify-center mx-auto text-brand-danger shadow-inner">
            <AlertTriangle size={40} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-black text-brand-primary">{title}</h2>
            <p className="text-text-muted font-medium leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <button 
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full bg-brand-danger text-white py-5 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-danger/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : null}
              <span>Yes, Delete Forever</span>
            </button>
            <button 
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-5 rounded-2xl font-bold text-text-muted hover:bg-bg-sidebar transition-all flex items-center justify-center gap-2"
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
