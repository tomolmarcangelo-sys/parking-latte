import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Mail, Lock, User as UserIcon, Shield, RefreshCw } from 'lucide-react';
import { apiClient } from '../lib/api';
import { toast } from 'react-hot-toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/users', { email, password, name, role });
      toast.success('User created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create user:', err);
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 transition-colors"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1F2E]/10 rounded-xl flex items-center justify-center text-[#1A1F2E]">
              <UserPlus size={20} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1F2E] tracking-tight">Enlist Personnel</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-[#64748B]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar transition-colors">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] transition-all font-bold text-[#1A1F2E] placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] transition-all font-bold text-[#1A1F2E] placeholder:text-slate-300"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Temporary Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] transition-all font-bold text-[#1A1F2E] placeholder:text-slate-300"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Assign Role</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] transition-all font-black text-[10px] uppercase tracking-widest text-[#1A1F2E] appearance-none shadow-sm cursor-pointer"
              >
                <option value="CUSTOMER">Customer Account</option>
                <option value="STAFF">Service Staff</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 transition-colors">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] hover:text-[#1A1F2E] transition-all font-sans"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-[#1A1F2E] text-white py-4 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <UserPlus size={20} />
            )}
            <span className="text-xs font-black uppercase tracking-widest">{isSubmitting ? 'Enlisting...' : 'Create User'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
