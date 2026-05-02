import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Coffee, ArrowRight, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { motion } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';
import AuthNavbar from '../components/navigation/AuthNavbar';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email to resend the verification link.');
      return;
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResendStatus('idle');
    
    try {
      const data = await apiClient.post('/auth/login', { email, password });
      if (data.token) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setError('Invalid email or password');
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.notVerified) {
        setError('Please verify your email address before logging in.');
      } else {
        setError(err.response?.data?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.post('/auth/google', { 
        credential: credentialResponse.credential 
      });
      if (data.token) {
        login(data.token, data.user);
        navigate('/');
      }
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base relative overflow-hidden pt-24 md:pt-20">
      <AuthNavbar />
      
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-bg-sidebar rounded-[3rem] p-8 md:p-12 coffee-shadow border border-border-subtle relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-block p-5 bg-brand-primary/5 rounded-[24px] mb-6 shadow-inner text-brand-primary transition-transform hover:scale-105">
            <Coffee size={40} strokeWidth={1.5} />
          </Link>
          <Link to="/">
            <h1 className="text-4xl font-serif font-bold tracking-tight text-brand-primary mb-2 hover:opacity-80 transition-opacity">Parking Latte</h1>
          </Link>
          <p className="text-text-muted text-sm italic font-medium">Brewing your digital experience.</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-brand-danger text-xs mb-6 text-center font-bold bg-brand-danger/10 p-4 rounded-2xl border border-brand-danger/20"
          >
            <p className="mb-2">{error}</p>
            {error.includes('verify your email') && (
              <button 
                type="button" 
                onClick={handleResendVerification}
                disabled={resending}
                className="text-brand-primary underline underline-offset-4 hover:text-brand-secondary transition-colors"
              >
                {resending ? 'Sending...' : 'Resend verification link'}
              </button>
            )}
            {resendStatus === 'success' && (
              <p className="text-brand-primary mt-2">Verification link sent! Please check your inbox.</p>
            )}
            {resendStatus === 'error' && (
              <p className="text-brand-danger mt-2">Failed to send link. Please try again later.</p>
            )}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black mb-1 ml-1 uppercase tracking-[0.2em] text-text-muted">Email Address</label>
            <input 
              type="email" 
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-2xl bg-bg-sidebar/50 border border-border-subtle focus:border-brand-primary outline-none transition-all font-medium text-brand-primary placeholder:text-text-muted/40"
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black mb-1 ml-1 uppercase tracking-[0.2em] text-text-muted">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pr-12 rounded-2xl bg-bg-sidebar/50 border border-border-subtle focus:border-brand-primary outline-none transition-all font-medium text-brand-primary placeholder:text-text-muted/40"
                placeholder="••••••••"
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

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-border-subtle text-brand-primary focus:ring-brand-primary cursor-pointer" />
              <span className="text-xs font-bold text-text-muted group-hover:text-brand-primary transition-colors">Remember me</span>
            </label>
            <Link to="#" className="text-xs font-bold text-brand-secondary hover:underline underline-offset-4">Forgot password?</Link>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold hover:bg-brand-secondary transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/10 disabled:opacity-70 group"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Sign In <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-[1px] bg-border-subtle/50"></div>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">Or continue with</span>
          <div className="flex-1 h-[1px] bg-border-subtle/50"></div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
            shape="pill"
            theme="outline"
            size="large"
            width="100%"
          />
        </div>

        <p className="mt-10 text-center text-sm text-text-muted font-medium">
          Don't have an account? {' '}
          <Link to="/register" className="text-brand-primary font-bold hover:text-brand-secondary transition-colors">Create Account</Link>
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

export default Login;
