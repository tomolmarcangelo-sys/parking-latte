import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, Coffee, ArrowRight } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailFromParam = searchParams.get('email');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendEmail] = useState(emailFromParam || '');
  const inputs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;
    
    setStatus('loading');
    try {
      await apiClient.post('/auth/verify-code', { email: resendEmail, code: fullCode });
      setStatus('success');
      setMessage('Account successfully roasted! ☕');
      setTimeout(() => navigate('/login?status=success'), 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Verification failed. The code may be invalid or expired.');
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || cooldown > 0) return;
    
    setResending(true);
    setResendStatus('idle');
    try {
      await apiClient.post('/auth/resend-verification', { email: resendEmail });
      setResendStatus('success');
      setCooldown(60);
    } catch (err) {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-bg-sidebar rounded-[3rem] p-10 md:p-12 coffee-shadow border border-slate-200 dark:border-slate-800 relative z-10 text-center"
      >
        <div className="inline-block p-5 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-[24px] mb-8 shadow-inner text-brand-primary">
          <Coffee size={40} strokeWidth={1.5} />
        </div>

        {status === 'success' ? (
          <div className="space-y-6">
            <CheckCircle2 size={48} className="mx-auto text-brand-secondary" />
            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-50 tracking-tight">Email Verified!</h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{message}</p>
            <Link 
              to="/login"
              className="w-full inline-flex bg-brand-primary text-white py-5 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 items-center justify-center gap-3"
            >
              Proceed to Login <ArrowRight size={20} />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-brand-primary">Verify Your Email</h1>
            <p className="text-slate-600 dark:text-slate-400">Enter the 6-digit code sent to {resendEmail || 'your email'}.</p>
            
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center gap-2 md:gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInput(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-16 md:w-14 md:h-18 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none text-2xl md:text-3xl text-center font-serif font-bold text-slate-900 dark:text-white transition-all shadow-sm"
                  />
                ))}
              </div>
              <button 
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold hover:bg-brand-secondary transition-all disabled:opacity-50"
              >
                {status === 'loading' ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
            
            {status === 'error' && (
              <p className="text-xs text-brand-danger font-bold">{message}</p>
            )}

            <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800/50">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">Didn't receive a code?</p>
              <button 
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full bg-transparent text-brand-primary border-2 border-brand-primary/30 py-3 rounded-xl font-bold hover:bg-brand-primary/10 transition-all text-sm disabled:opacity-50"
              >
                {resending ? 'Sending...' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
              </button>
              {resendStatus === 'success' && (
                <p className="text-[10px] text-brand-primary mt-3 font-bold">A new code is on its way to your inbox! ☕</p>
              )}
              {resendStatus === 'error' && (
                <p className="text-[10px] text-brand-danger mt-3 font-bold">Failed to send. Please try again.</p>
              )}
            </div>
            
            <Link to="/login" className="text-sm font-bold text-brand-secondary hover:underline">
              Back to Login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
