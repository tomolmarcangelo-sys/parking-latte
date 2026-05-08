import React, { useState } from 'react';
import { User, Role } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Mail, Shield, Save } from 'lucide-react';
import { apiClient } from '../lib/api';
import { toast } from 'react-hot-toast';

interface UserEditModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ user: initialUser, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: initialUser.name || '',
    email: initialUser.email,
    role: initialUser.role as Role
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.put(`/users/${initialUser.id}`, formData);
      toast.success('User updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-primary/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-bg-sidebar rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-border-subtle flex justify-between items-center bg-bg-sidebar/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
              <UserIcon size={20} />
            </div>
            <h2 className="text-xl font-bold text-brand-primary">Edit User Identity</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-border-subtle rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-primary outline-none transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-primary outline-none transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Access Role</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <select 
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
                className="w-full pl-12 pr-10 py-3 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-primary outline-none transition-all font-medium appearance-none"
              >
                <option value="CUSTOMER">Customer Account</option>
                <option value="STAFF">Service Staff</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-8 bg-bg-sidebar/30 border-t border-border-subtle flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 border border-border-subtle rounded-2xl font-bold hover:bg-border-subtle transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Save size={18} />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
