import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { User, Camera, ArrowRight, Loader2, ShieldCheck, Check } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { UserDocument } from '../types';
import { ImageCropper } from './ImageCropper';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';

import { ThreeBackground } from './ThreeBackground';

interface OnboardingProps {
  user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null };
  onComplete: (profile: UserDocument) => void;
}

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState(user.displayName || '');
  const [profileImage, setProfileImage] = useState<string | null>(user.photoURL || null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  
  // Modal states
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  
  // Step 2 state
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const containerVariants: any = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1],
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setProfileImage(croppedImage);
    setCropImageSrc(null);
  };

  const handleContinueToTerms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy) {
      toast.error('Please accept the Terms and Privacy Policy to continue.');
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
      let finalImageUrl = profileImage || '';

      // 1. Upload image to Supabase Storage if present and it's a new file
      if (fileInputRef.current?.files?.[0]) {
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
            description: 'Your profile will be created with the existing image if available.'
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
        stats: defaultStats,
        risk_score: 15,
        preferences: {
          darkMode: true,
          highContrast: false,
          notifications: true,
          soundEffects: true,
          hapticFeedback: true,
          hasAcceptedTerms: true
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
        stats: profileData.stats,
        riskScore: profileData.risk_score,
        preferences: profileData.preferences
      };

      toast.success('Profile created successfully!');
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSuccess(true);
      
      console.log('Onboarding: Final userDoc ready:', userDoc);
      
      // Give the user 1.2 seconds to see the success state
      setTimeout(() => {
        console.log('Onboarding: Calling onComplete after delay');
        onComplete(userDoc);
      }, 1200);
      
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
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="z-10 text-center space-y-6"
        >
          <div className="w-24 h-24 bg-cyber-green/20 rounded-full flex items-center justify-center mx-auto border-2 border-cyber-green shadow-[0_0_30px_rgba(0,255,0,0.2)]">
            <Logo size="lg" className="text-cyber-green" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-cyber-green">Access Granted</h2>
            <p className="text-white/60">Welcome to CREDENTIA, {username}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-cyber-green/60 font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Setting up your account...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="w-full max-w-xl z-10 overflow-y-auto max-h-[90vh] no-scrollbar py-4">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -50 }}
              className={`bg-white/5 backdrop-blur-[30px] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 md:space-y-8 transition-all duration-300 ${cropImageSrc ? 'blur-md scale-95 opacity-40 pointer-events-none' : ''}`}
            >
              <motion.div variants={itemVariants} className="text-center space-y-2">
                <div className="mb-4 flex justify-center">
                  <Logo size="md" glow />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Profile Setup</h1>
                <p className="text-white/60">Complete your profile to enter CREDENTIA</p>
              </motion.div>

              <motion.form onSubmit={handleContinueToTerms} className="space-y-6">
                {/* Profile Image Upload */}
                <motion.div variants={itemVariants} className="flex flex-col items-center space-y-4">
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
                  <p className="text-xs text-white/40">Upload Profile Photo (Optional)</p>
                </motion.div>

                {/* Username Input */}
                <motion.div variants={itemVariants} className="space-y-2">
                  <label className="text-sm font-bold text-white/70 ml-1 uppercase tracking-wider">Display Name</label>
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
                </motion.div>

                <motion.button 
                  variants={itemVariants}
                  type="submit"
                  className="w-full bg-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </motion.form>
            </motion.div>
          ) : (
             <motion.div 
              key="step2"
              variants={containerVariants}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white/5 backdrop-blur-[30px] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 md:space-y-8"
            >
              <motion.div variants={itemVariants} className="text-center space-y-2">
                <div className="mb-4 flex justify-center">
                  <ShieldCheck className="w-12 h-12 text-cyber-blue opacity-80" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Legal & Privacy</h1>
                <p className="text-white/60">Please review and accept our policies</p>
              </motion.div>

              <motion.form onSubmit={handleSubmit} className="space-y-6">
                
                <motion.div variants={itemVariants} className="space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-6 h-6 mt-0.5 rounded border border-white/30 bg-black/50 group-hover:border-cyber-blue transition-colors shrink-0">
                      <input 
                        type="checkbox" 
                        className="opacity-0 absolute inset-0 cursor-pointer"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                      />
                      {acceptedTerms && <Check className="w-4 h-4 text-cyber-blue pointer-events-none" />}
                    </div>
                    <div className="text-sm text-white/80 leading-relaxed">
                      I have read and agree to the <button type="button" onClick={() => setIsTermsOpen(true)} className="text-cyber-blue hover:underline cursor-pointer">Terms of Service</button>. I understand this platform is strictly for authorized educational purposes.
                    </div>
                  </label>

                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-6 h-6 mt-0.5 rounded border border-white/30 bg-black/50 group-hover:border-cyber-blue transition-colors shrink-0">
                      <input 
                        type="checkbox" 
                        className="opacity-0 absolute inset-0 cursor-pointer"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      />
                      {acceptedPrivacy && <Check className="w-4 h-4 text-cyber-blue pointer-events-none" />}
                    </div>
                    <div className="text-sm text-white/80 leading-relaxed">
                      I have read and agree to the <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-cyber-blue hover:underline cursor-pointer">Privacy Policy</button>. I understand how my data will be handled.
                    </div>
                  </label>
                </motion.div>

                {submitError && (
                  <motion.div variants={itemVariants} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-mono break-all">
                    <p className="font-bold mb-1 uppercase">Error Details:</p>
                    {submitError}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <motion.button 
                    variants={itemVariants}
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="px-6 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-colors font-bold disabled:opacity-50"
                  >
                    Back
                  </motion.button>
                  <motion.button 
                    variants={itemVariants}
                    type="submit"
                    disabled={isSubmitting || !acceptedTerms || !acceptedPrivacy}
                    className="flex-1 bg-cyber-blue text-black font-bold py-4 rounded-2xl hover:bg-cyber-blue/90 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,255,255,0.3)] disabled:opacity-50 disabled:shadow-none disabled:bg-white/20 disabled:text-white/50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Entering...
                      </>
                    ) : (
                      <>
                        Enter Platform
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <PrivacyPolicy isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfService isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Image Cropper Modal */}
      <AnimatePresence>
        {cropImageSrc && (
          <ImageCropper
            imageSrc={cropImageSrc}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropImageSrc(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
