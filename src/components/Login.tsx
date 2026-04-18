import React, { useState, useEffect } from 'react';
import { Lock, Mail, ArrowLeft, Shield, Chrome, Eye, EyeOff } from 'lucide-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { cn } from '../utils/cn';
import { toast } from 'sonner';
import { ThreeBackground } from './ThreeBackground';

interface LoginProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function Login({ onBack, onSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[a-z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass) || /[\W_]/.test(pass)) strength += 25;
    return strength;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && password.length < 6) {
      toast.error('Password too short', { description: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      if (isSignUp && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: email.split('@')[0] } }
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setIsEntering(true);
          setTimeout(onSuccess, 1000);
        } else if (data.user) {
          toast.info('Verification Required', { description: 'Please check your email to confirm your account.' });
          setTimeout(onSuccess, 2000);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setIsEntering(true);
        setTimeout(onSuccess, 1000);
      }
    } catch (err: any) {
      toast.error('Authentication Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      toast.error('Google Auth Failed', { description: err.message });
      setLoading(false);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1], // Quintic ease out for "crystal" feel
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      },
    },
  };

  const formVariants: any = {
    hidden: (isSignUp: boolean) => ({
      opacity: 0,
      x: isSignUp ? 20 : -20
    }),
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1],
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    },
    exit: (isSignUp: boolean) => ({
      opacity: 0,
      x: isSignUp ? -20 : 20,
      transition: { duration: 0.3 }
    })
  };

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="w-full max-w-md z-10 overflow-y-auto max-h-[95vh] no-scrollbar py-4">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ filter: isEntering ? 'blur(10px)' : 'blur(0px)' }}
          className="relative"
        >
          {/* Floating Glass Panel */}
          <div className="bg-white/5 backdrop-blur-[30px] border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Internal Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyber-blue/20 blur-[80px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyber-purple/20 blur-[80px] rounded-full" />

          <button 
            onClick={onBack}
            className="absolute top-4 md:top-6 left-4 md:left-6 p-2 hover:bg-white/10 rounded-full transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-white/50 group-hover:text-white" />
          </button>

          <motion.div variants={itemVariants} className="flex flex-col items-center mb-6 md:mb-8 pt-6 md:pt-4">
            <div className="relative mb-4 scale-90 md:scale-100">
              <Logo size="md" glow />
              <div className="absolute inset-0 bg-cyber-blue/20 blur-xl -z-10 animate-pulse" />
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-cyber-blue text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mt-2 opacity-60">
              {isSignUp ? 'Join the future of AI defense' : 'Sign in to your secure dashboard'}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={isSignUp ? 'signup' : 'login'}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={isSignUp}
              onSubmit={handleEmailAuth} 
              className="space-y-6"
            >
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-cyber-blue transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyber-blue/50 transition-all text-sm font-medium tracking-wide"
                    placeholder="name@example.com"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-cyber-blue transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (isSignUp) setShowPasswordStrength(true);
                    }}
                    onFocus={() => isSignUp && setShowPasswordStrength(true)}
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:border-cyber-blue/50 transition-all text-sm font-medium tracking-wide"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isSignUp && showPasswordStrength && (
                  <div className="mt-3 px-1 space-y-1.5">
                    <div className="flex gap-1.5 h-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "flex-1 rounded-full transition-all duration-700",
                            getPasswordStrength(password) >= i * 25 
                              ? (getPasswordStrength(password) <= 50 ? "bg-cyber-red shadow-[0_0_10px_rgba(239,68,68,0.5)]" : getPasswordStrength(password) <= 75 ? "bg-cyber-yellow shadow-[0_0_10px_rgba(234,179,8,0.5)]" : "bg-cyber-green shadow-[0_0_10px_rgba(34,197,94,0.5)]")
                              : "bg-white/5"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {isSignUp && (
                <motion.div variants={itemVariants} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-cyber-blue transition-colors" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:border-cyber-blue/50 transition-all text-sm font-medium tracking-wide"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white/60"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}

              <motion.button 
                variants={itemVariants}
                type="submit"
                disabled={loading}
                className="group relative w-full bg-cyber-blue text-black font-black py-3 rounded-2xl hover:bg-white transition-all mt-6 disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative tracking-[0.3em] uppercase italic">
                  {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Log In')}
                </span>
              </motion.button>
            </motion.form>
          </AnimatePresence>

          <motion.div variants={itemVariants} className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] font-black text-white/20 tracking-[0.3em]">OR CONTINUE WITH</span>
            <div className="flex-1 h-px bg-white/5" />
          </motion.div>

          <motion.button 
            variants={itemVariants}
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-3 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm tracking-widest uppercase">Google</span>
          </motion.button>

          <div className="mt-10 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-cyber-blue/60 hover:text-cyber-blue text-[10px] font-black tracking-[0.2em] uppercase transition-colors"
            >
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
  );
}
