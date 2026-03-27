import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  variant?: 'main' | 'ai';
}

export function Logo({ className, size = 'md', glow = false, variant = 'main' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const images = {
    main: "https://i.ibb.co/3Y8tPyym/IMG-20260327-095240.png",
    ai: "https://i.ibb.co/Wv8mcy8x/file-00000000b5a472088dc90f5d24eb3b65.png"
  };

  // System Boot Flicker sequence
  const bootVariants = {
    initial: { opacity: 0, scale: 0.8, filter: 'brightness(0)' },
    boot: {
      opacity: [0, 0.4, 0.2, 0.8, 0.5, 1],
      scale: [0.8, 0.9, 0.85, 1.05, 0.98, 1],
      filter: ['brightness(0)', 'brightness(1.5)', 'brightness(0.5)', 'brightness(2)', 'brightness(0.8)', 'brightness(1)'],
      transition: {
        duration: 0.8,
        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        ease: "easeInOut" as const
      }
    }
  };

  // Neural Pulse animation for the glow
  const pulseTransition = {
    duration: 3,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut" as const
  };

  return (
    <motion.div
      variants={bootVariants}
      initial="initial"
      animate="boot"
      className={cn('flex items-center justify-center p-1', className)}
    >
      <motion.img
        src={images[variant]}
        alt={variant === 'ai' ? "AI Mentor Logo" : "Credentia Logo"}
        animate={glow ? {
          filter: [
            'drop-shadow(0 0 8px rgba(0, 242, 255, 0.4))',
            'drop-shadow(0 0 20px rgba(0, 242, 255, 0.8))',
            'drop-shadow(0 0 8px rgba(0, 242, 255, 0.4))'
          ]
        } : {}}
        transition={glow ? pulseTransition : {}}
        className={cn(
          'object-contain', 
          sizeClasses[size]
        )}
        referrerPolicy="no-referrer"
      />
    </motion.div>
  );
}
