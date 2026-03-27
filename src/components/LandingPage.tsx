import React from 'react';
import { ShieldCheck, Activity, Bot, Lock, User } from 'lucide-react';
import { Logo } from './Logo';
import { motion } from 'motion/react';

interface LandingPageProps {
  onLogin: () => void;
  onGuest: () => void;
}

export function LandingPage({ onLogin, onGuest }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-cyber-bg text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-blue/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-purple/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 max-w-md w-full flex flex-col items-center text-center space-y-8"
      >
        {/* Logo & Branding Area */}
        <div className="flex flex-col items-center space-y-4">
          <Logo size="lg" glow />
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-[0.15em] text-white drop-shadow-[0_0_15px_rgba(0,242,255,0.4)]">
              CREDENTIA
            </h1>
            <p className="text-cyber-blue/80 text-sm md:text-base font-medium tracking-wide">
              Where Identity Meets Defense
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4 pt-2">
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogin}
            className="w-full bg-cyber-blue text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.5)] border border-cyber-blue/50"
          >
            <Lock className="w-5 h-5" />
            Login / Sign Up
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGuest}
            className="w-full bg-white/5 backdrop-blur-md border border-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3"
          >
            <User className="w-5 h-5 text-white/50" />
            Continue as Guest
          </motion.button>
        </div>

        {/* Feature Indicators */}
        <div className="pt-6 flex flex-wrap justify-center gap-3 text-xs text-white/60">
          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
            <Bot className="w-3.5 h-3.5 text-cyber-blue" />
            <span>AI Powered</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-cyber-green" />
            <span>Secure Login</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
            <Activity className="w-3.5 h-3.5 text-cyber-purple" />
            <span>Real-time Analysis</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
