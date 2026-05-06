import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, UserPlus } from 'lucide-react';
import { apiClient } from '../lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/users', { email, password, name, role });
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-bg-sidebar rounded-[32px] p-8 w-full max-w-lg shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-brand-primary">Create New User</h2>
            <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Name" className="w-full p-3 border rounded-xl" value={name} onChange={e => setName(e.target.value)} />
            <input type="email" placeholder="Email" className="w-full p-3 border rounded-xl" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} required />
            <select className="w-full p-3 border rounded-xl" value={role} onChange={e => setRole(e.target.value)}>
                <option value="CUSTOMER">Customer</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" className="w-full bg-brand-primary text-white p-3 rounded-xl font-bold">Create User</button>
        </form>
      </motion.div>
    </motion.div>
  );
};
