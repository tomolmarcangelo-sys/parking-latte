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
  const email = searchParams.get('email');

  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    
    setResending(true);
    setResendStatus('idle');
    try {
      await apiClient.post('/auth/resend-verification', { email: resendEmail });
      setResendStatus('success');
    } catch (err) {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }

      try {
        const response = await apiClient.get(`/auth/verify-email?token=${token}&email=${email}`);
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
            
            <div className="bg-bg-sidebar/30 p-6 rounded-[2rem] border border-border-subtle/50">
              <p className="text-xs font-bold text-text-muted mb-4">Request a new verification link:</p>
              <form onSubmit={handleResend} className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Your email address"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-border-subtle focus:border-brand-primary outline-none text-sm transition-all"
                />
                <button 
                  type="submit"
                  disabled={resending}
                  className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-secondary transition-all text-sm disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend Link'}
                </button>
              </form>
              {resendStatus === 'success' && (
                <p className="text-[10px] text-brand-primary mt-3 font-bold">New link sent! Check your inbox.</p>
              )}
              {resendStatus === 'error' && (
                <p className="text-[10px] text-brand-danger mt-3 font-bold">Failed to send. Please try again.</p>
              )}
            </div>

            <div className="pt-4 flex flex-col gap-4">
              <Link 
                to="/register"
                className="w-full text-brand-primary py-4 rounded-2xl font-bold hover:bg-brand-primary/5 transition-all inline-flex items-center justify-center gap-3 border border-brand-primary/20"
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
