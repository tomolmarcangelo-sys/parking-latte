import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Mail, Shield, Save, CheckCircle2 } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, updateUserInfo } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedUser = await apiClient.put('/auth/profile', { name });
      updateUserInfo(updatedUser);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-bg-sidebar/50 rounded-[40px] coffee-shadow border border-border-subtle overflow-hidden transition-colors duration-300"
      >
        <div className="bg-brand-primary p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
              <UserIcon size={48} className="text-white" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-serif font-bold mb-2">{user.name || 'Coffee Enthusiast'}</h1>
              <p className="text-white/60 font-medium tracking-wide uppercase text-xs">{user.role} Account</p>
            </div>
          </div>
        </div>

        <div className="p-12">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 ml-1">Account Identity</label>
                <div className="space-y-4">
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full pl-14 pr-6 py-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
                      required
                    />
                  </div>
                  
                  <div className="relative opacity-60">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input 
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full pl-14 pr-6 py-4 bg-bg-sidebar border border-border-subtle rounded-2xl font-medium cursor-not-allowed"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted uppercase">Primary Email</div>
                  </div>

                  <div className="relative opacity-60">
                    <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input 
                      type="text"
                      value={user.role}
                      disabled
                      className="w-full pl-14 pr-6 py-4 bg-bg-sidebar border border-border-subtle rounded-2xl font-medium cursor-not-allowed capitalize"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted uppercase">Access Level</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={isSaving || name === user.name}
                className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save size={20} />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-brand-secondary text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl font-bold z-50"
          >
            <CheckCircle2 size={24} />
            Profile updated successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
