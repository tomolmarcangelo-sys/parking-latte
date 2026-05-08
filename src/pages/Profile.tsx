import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Mail, Shield, Save, CheckCircle2, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, updateUserInfo } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedUser = await apiClient.put('/auth/profile', { name });
      updateUserInfo(updatedUser);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8 || !/\d/.test(passwordData.newPassword)) {
      toast.error('New password must be at least 8 characters long and contain at least one number');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-12">
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

      {/* Change Password Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-bg-sidebar/50 rounded-[40px] coffee-shadow border border-border-subtle overflow-hidden"
      >
        <div className="p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
              <KeyRound size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-brand-primary">Update Password</h2>
              <p className="text-text-muted text-sm">Keep your account secure with a strong password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full pl-14 pr-12 py-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-primary transition-colors"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="New password"
                    className="w-full pl-14 pr-12 py-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-primary transition-colors"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                    className="w-full pl-14 pr-12 py-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-primary transition-colors"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isChangingPassword}
                className="w-full md:w-auto px-12 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save size={18} />
                )}
                <span>Update Password</span>
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
