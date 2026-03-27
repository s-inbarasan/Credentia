import React, { useState } from 'react';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { cn } from '../utils/cn';
import { toast } from 'sonner';

interface LoginProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function Login({ onBack, onSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  console.log('Login component rendered', { isSignUp });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

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
    console.log('Form submitted', { isSignUp, email, passwordLength: password.length });
    
    if (isSignUp && password.length < 6) {
      toast.error('Password too short', {
        description: 'Password must be at least 6 characters.'
      });
      return;
    }

    setLoading(true);
    console.log('Starting authentication process...');
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        
        if (signUpError) {
          console.error('SignUp Error:', signUpError);
          throw signUpError;
        }
        
        console.log('SignUp Success:', data);
        
        if (data.session) {
          toast.success('Welcome to CREDENTIA!');
          onSuccess();
        } else if (data.user) {
          toast.info('Verification Required', {
            description: 'Please check your email to confirm your account before logging in.'
          });
          // Even if session is null, we can close the modal to show the landing page
          // so the user knows the action was successful.
          setTimeout(() => onSuccess(), 3000);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        toast.success('Welcome back, Agent');
        onSuccess();
      }
    } catch (err: any) {
      toast.error('Authentication Failed', {
        description: err.message || 'Please check your credentials.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (googleError) throw googleError;
      // Note: signInWithOAuth usually redirects, so onSuccess might not be called immediately here
    } catch (err: any) {
      toast.error('Google Auth Failed', {
        description: err.message || 'Please try again.'
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-blue/20 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-md bg-cyber-card border border-white/10 p-8 rounded-3xl shadow-2xl relative"
      >
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center mb-8 pt-4">
          <Logo size="lg" glow className="mb-4" />
          <h2 className="text-2xl font-bold">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="text-white/50 text-sm mt-2">
            {isSignUp ? 'Join the CREDENTIA platform' : 'Log in to continue your learning'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/70 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyber-blue transition-colors"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/70 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (isSignUp) setShowPasswordStrength(true);
                }}
                onFocus={() => isSignUp && setShowPasswordStrength(true)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyber-blue transition-colors"
                placeholder="Enter your password"
              />
            </div>
            {isSignUp && showPasswordStrength && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 rounded-full transition-all duration-500",
                        getPasswordStrength(password) >= i * 25 
                          ? (getPasswordStrength(password) <= 50 ? "bg-cyber-red" : getPasswordStrength(password) <= 75 ? "bg-cyber-yellow" : "bg-cyber-green")
                          : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-white/40">
                  {getPasswordStrength(password) < 50 ? "Weak" : getPasswordStrength(password) < 100 ? "Moderate" : "Strong"} password
                </p>
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            onClick={() => console.log('Submit button clicked')}
            className="w-full bg-cyber-blue text-black font-bold py-3 rounded-xl hover:bg-cyber-blue/90 transition-all mt-6 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-sm">OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button 
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-white text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 border border-gray-200 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
            }}
            className="text-cyber-blue hover:underline text-sm"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
