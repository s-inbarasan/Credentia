import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { User, Camera, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { UserDocument } from '../types';

interface OnboardingProps {
  user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null };
  onComplete: (profile: UserDocument) => void;
}

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [username, setUsername] = useState(user.displayName || '');
  const [profileImage, setProfileImage] = useState<string | null>(user.photoURL || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfileImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setSubmitError(null);
    console.log('Onboarding: Starting submission for user:', user.uid);
    
    // Set a safety timeout to prevent infinite hang
    const timeoutId = setTimeout(() => {
      if (isSubmittingRef.current) {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        toast.error('Connection Timeout', {
          description: 'The request is taking too long. Please check your connection and try again.'
        });
      }
    }, 30000); // Increased to 30s for mobile users

    try {
      let finalImageUrl = '';

      // 1. Upload image to Supabase Storage if present
      if (profileImage && fileInputRef.current?.files?.[0]) {
        console.log('Onboarding: Uploading profile image...');
        const file = fileInputRef.current.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `profile.${fileExt}`;
        const filePath = `${user.uid}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Onboarding: Image upload error:', uploadError);
          // Don't throw here, just log it. We can still create the profile without an image.
          toast.warning('Image Upload Failed', {
            description: 'Your profile will be created without a custom image.'
          });
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('profile-images')
            .getPublicUrl(filePath);
          
          finalImageUrl = publicUrl;
          console.log('Onboarding: Image uploaded successfully. URL:', finalImageUrl);
        }
      }

      const defaultStats = {
        aiQueries: 0,
        actionsTaken: 0,
        strongPasswords: 0,
        phishingDetected: 0,
        threatsAnalyzed: 0,
        toolsUsed: [],
        simulationsCompleted: 0,
        topicsCompleted: 0,
        quizzesPassed: 0
      };

      const profileData = {
        id: user.uid,
        name: username,
        email: user.email,
        xp: 0,
        level: 1,
        created_at: new Date().toISOString(),
        profile_image: finalImageUrl,
        badges: [],
        completed_topics: [],
        quiz_scores: {},
        simulation_scores: {},
        stats: defaultStats,
        risk_score: 15,
        preferences: {
          darkMode: true,
          highContrast: false,
          notifications: true,
          soundEffects: true,
          hapticFeedback: true
        }
      };

      console.log('Onboarding: Creating profile in database...');
      // 2. Upsert into profiles table (upsert is safer than insert)
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (dbError) {
        console.error('Onboarding: Database error:', dbError);
        throw dbError;
      }

      console.log('Onboarding: Profile created successfully in DB. Calling onComplete...');

      // 3. Map to UserDocument and complete
      const userDoc: UserDocument = {
        uid: profileData.id,
        name: profileData.name,
        email: profileData.email,
        xp: profileData.xp,
        level: profileData.level,
        createdAt: profileData.created_at,
        profileImage: profileData.profile_image,
        badges: profileData.badges,
        completedTopics: profileData.completed_topics,
        quizScores: profileData.quiz_scores,
        simulationScores: profileData.simulation_scores,
        stats: profileData.stats,
        riskScore: profileData.risk_score,
        preferences: profileData.preferences
      };

      toast.success('Profile created successfully!');
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSuccess(true);
      
      console.log('Onboarding: Final userDoc ready:', userDoc);
      
      // Give the user 2 seconds to see the success state
      setTimeout(() => {
        console.log('Onboarding: Calling onComplete after delay');
        onComplete(userDoc);
      }, 2000);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      console.error('Onboarding error:', error);
      const errorMsg = error.message || JSON.stringify(error);
      setSubmitError(errorMsg);
      toast.error('Failed to create profile', {
        description: errorMsg
      });
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-cyber-bg text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-green/20 blur-[120px] rounded-full" />
        </div>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="z-10 text-center space-y-6"
        >
          <div className="w-24 h-24 bg-cyber-green/20 rounded-full flex items-center justify-center mx-auto border-2 border-cyber-green shadow-[0_0_30px_rgba(0,255,0,0.2)]">
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Shield className="w-12 h-12 text-cyber-green" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-cyber-green">Access Granted</h2>
            <p className="text-white/60">Welcome to CREDENTIA, Agent {username}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-cyber-green/60 font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Synchronizing Neural Link...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-blue/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 max-w-md w-full bg-cyber-card border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-cyber-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyber-blue/20">
            <Shield className="w-8 h-8 text-cyber-blue" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Setup</h1>
          <p className="text-white/60">Complete your profile to enter CREDENTIA</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-black/40 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-cyber-blue/50 transition-colors relative group overflow-hidden"
            >
              {profileImage ? (
                <img src={profileImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-white/20 group-hover:text-cyber-blue/50 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <p className="text-[10px] font-bold uppercase">Change</p>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <p className="text-xs text-white/40">Upload Agent Identity (Optional)</p>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/70 ml-1 uppercase tracking-wider">Agent Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-cyber-blue transition-colors"
              />
            </div>
          </div>

          {submitError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-mono break-all">
              <p className="font-bold mb-1 uppercase">Error Details:</p>
              {submitError}
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-cyber-blue text-black font-bold py-4 rounded-2xl hover:bg-cyber-blue/90 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,255,255,0.3)] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                Enter Platform
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
