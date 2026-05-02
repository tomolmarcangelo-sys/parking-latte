import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, Coffee, ArrowRight } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }

      try {
        const response = await apiClient.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-bg-sidebar rounded-[3rem] p-12 coffee-shadow border border-border-subtle relative z-10 text-center"
      >
        <div className="inline-block p-5 bg-brand-primary/5 rounded-[24px] mb-8 shadow-inner text-brand-primary">
          <Coffee size={40} strokeWidth={1.5} />
        </div>

        {status === 'loading' && (
          <div className="space-y-6">
            <Loader2 size={48} className="mx-auto text-brand-secondary animate-spin" />
            <h1 className="text-2xl font-serif font-bold text-brand-primary">Verifying your account...</h1>
            <p className="text-text-muted">Please wait while we confirm your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <CheckCircle2 size={48} className="mx-auto text-green-500" />
            <h1 className="text-2xl font-serif font-bold text-brand-primary">Email Verified!</h1>
            <p className="text-text-muted">{message}</p>
            <Link 
              to="/login"
              className="w-full inline-flex bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all items-center justify-center gap-3 shadow-xl shadow-brand-primary/10"
            >
              Go to Login <ArrowRight size={20} />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <XCircle size={48} className="mx-auto text-brand-danger" />
            <h1 className="text-2xl font-serif font-bold text-brand-primary">Verification Failed</h1>
            <p className="text-text-muted">{message}</p>
            <div className="pt-4 flex flex-col gap-4">
              <Link 
                to="/register"
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all inline-flex items-center justify-center gap-3"
              >
                Create New Account
              </Link>
              <Link to="/login" className="text-sm font-bold text-brand-secondary hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
