import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Coffee, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import AuthNavbar from '../components/navigation/AuthNavbar';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    number: false,
    match: false
  });

  useEffect(() => {
    setPasswordStrength({
      length: password.length >= 8,
      number: /\d/.test(password),
      match: password === confirmPassword && password.length > 0
    });
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordStrength.length || !passwordStrength.number) {
      setError('Please follow the password requirements');
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.post('/auth/register', { email, password, name });
      if (data.requiresVerification) {
        setSuccess(true);
      } else if (data.token) {
        // Fallback or old behavior
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email already in use or join failed');
    } finally {
      setLoading(false);
    }
  };

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleResendVerification = async () => {
    setResending(true);
    setResendStatus('idle');
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setResendStatus('success');
    } catch (err) {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base relative overflow-hidden pt-24 md:pt-20">
        <AuthNavbar />
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
           <div className="absolute top-10 left-10 w-64 h-64 bg-brand-primary rounded-full blur-[120px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-bg-sidebar rounded-[3.5rem] p-12 coffee-shadow border border-border-subtle relative z-10 text-center"
        >
          <div className="inline-block p-5 bg-brand-primary/5 rounded-[24px] mb-8 shadow-inner text-brand-primary">
            <CheckCircle2 size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-serif font-bold text-brand-primary mb-4">Check Your Email</h1>
          <p className="text-text-muted mb-6 leading-relaxed">
            We've sent a verification link to <span className="font-bold text-brand-primary">{email}</span>. 
            Please verify your account to start ordering.
          </p>
          
          <div className="mb-8">
            <button 
              onClick={handleResendVerification}
              disabled={resending}
              className="text-xs font-bold text-brand-primary hover:text-brand-secondary transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending...' : "Didn't get the email? Click here to resend."}
            </button>
            {resendStatus === 'success' && (
              <p className="text-[10px] text-brand-primary mt-2">New link sent successfully!</p>
            )}
            {resendStatus === 'error' && (
              <p className="text-[10px] text-brand-danger mt-2">Failed to resend. Please try again later.</p>
            )}
          </div>

          <Link 
            to="/login"
            className="w-full inline-flex bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all items-center justify-center gap-3 shadow-xl shadow-brand-primary/10"
          >
            Back to Login <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base relative overflow-hidden pt-24 md:pt-20">
      <AuthNavbar />
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
         <div className="absolute top-10 left-10 w-64 h-64 bg-brand-primary rounded-full blur-[120px]"></div>
         <div className="absolute bottom-10 right-10 w-64 h-64 bg-brand-secondary rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white dark:bg-bg-sidebar rounded-[3.5rem] p-8 md:p-14 coffee-shadow border border-border-subtle relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-block p-5 bg-brand-primary/5 rounded-[24px] mb-6 shadow-inner text-brand-primary transition-transform hover:scale-105">
            <Coffee size={40} strokeWidth={1.5} />
          </Link>
          <Link to="/">
            <h1 className="text-4xl font-serif font-bold tracking-tight text-brand-primary mb-2 hover:opacity-80 transition-opacity">Join the Family</h1>
          </Link>
          <p className="text-text-muted text-sm italic font-medium">Create your Parking Latte account today.</p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-brand-danger text-xs mb-8 text-center font-bold bg-brand-danger/5 p-4 rounded-2xl border border-brand-danger/10"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-black mb-1 ml-1 uppercase tracking-[0.2em] text-text-muted">Full Name</label>
            <input 
              type="text" 
              required
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 rounded-2xl bg-bg-sidebar/30 border border-border-subtle focus:border-brand-primary outline-none transition-all font-medium text-brand-primary placeholder:text-text-muted/30"
              placeholder="How should we call you?"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-[10px] font-black mb-1 ml-1 uppercase tracking-[0.2em] text-text-muted">Email Address</label>
            <input 
              type="email" 
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-2xl bg-bg-sidebar/30 border border-border-subtle focus:border-brand-primary outline-none transition-all font-medium text-brand-primary placeholder:text-text-muted/30"
              placeholder="name@example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black mb-1 ml-1 uppercase tracking-[0.2em] text-text-muted">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 pr-12 rounded-2xl bg-bg-sidebar/30 border border-border-subtle focus:border-brand-primary outline-none transition-all font-medium text-brand-primary placeholder:text-text-muted/30"
                  placeholder="Min. 8 chars"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black mb-1 ml-1 uppercase tracking-[0.2em] text-text-muted">Confirm Password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 rounded-2xl bg-bg-sidebar/30 border border-border-subtle focus:border-brand-primary outline-none transition-all font-medium text-brand-primary placeholder:text-text-muted/30"
                placeholder="Match password"
              />
            </div>
          </div>

          {/* Password Strength Indicator */}
          <div className="bg-bg-sidebar/20 p-4 rounded-2xl border border-border-subtle/50 space-y-3">
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                {passwordStrength.length ? <CheckCircle2 size={12} className="text-green-500" /> : <Circle size={12} className="text-text-muted/30" />}
                <span className={passwordStrength.length ? "text-brand-primary" : "text-text-muted"}>8+ Characters</span>
             </div>
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                {passwordStrength.number ? <CheckCircle2 size={12} className="text-green-500" /> : <Circle size={12} className="text-text-muted/30" />}
                <span className={passwordStrength.number ? "text-brand-primary" : "text-text-muted"}>Includes Number</span>
             </div>
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                {passwordStrength.match ? <CheckCircle2 size={12} className="text-green-500" /> : <Circle size={12} className="text-text-muted/30" />}
                <span className={passwordStrength.match ? "text-brand-primary" : "text-text-muted"}>Passwords Match</span>
             </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !passwordStrength.length || !passwordStrength.number || !passwordStrength.match}
            className="w-full bg-brand-primary text-white py-5 mt-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/10 disabled:opacity-50 group"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Complete Registration <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-text-muted font-medium">
          Already have an account? {' '}
          <Link to="/login" className="text-brand-primary font-bold hover:text-brand-secondary transition-colors">Sign In</Link>
        </p>

        <div className="mt-6 flex justify-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-brand-primary transition-all group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
