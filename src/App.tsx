import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './components/Logo';
import { 
  Shield, 
  MessageSquare, 
  Lock, 
  AlertTriangle, 
  Zap, 
  Send, 
  User, 
  Bot, 
  ChevronRight, 
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Newspaper,
  ExternalLink,
  Trophy,
  Medal,
  Award,
  Star,
  Camera,
  X,
  Edit2,
  Copy,
  Check,
  Settings,
  Bell,
  Eye,
  ShieldAlert,
  PlayCircle,
  BookOpen,
  Home,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'sonner';
import { Message, RiskState, PasswordAnalysis, PhishingAnalysis, UserDocument, ChatSession } from './types';
import { analyzePassword, analyzePhishing } from './utils/analyzer';
import { getCyberResponse } from './services/geminiService';
import { LearningHub } from './components/LearningHub';
import { SimulationCenter } from './components/SimulationCenter';
import { SettingsModal } from './components/SettingsModal';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { ChatPanel } from './components/ChatPanel';
import { Onboarding } from './components/Onboarding';
import { BADGE_DEFINITIONS, checkNewBadges } from './utils/badges';
import { supabase } from './supabase';
import { cn } from './utils/cn';

const RiskMeter = ({ score }: { score: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let color = "stroke-cyber-green";
  if (score > 40) color = "stroke-cyber-yellow";
  if (score > 70) color = "stroke-cyber-red";

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-white/10"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn(color, "transition-colors duration-500")}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-50">Risk</span>
      </div>
    </div>
  );
};

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'tools' | 'learningHub' | 'profile'>('home');
  const [user, setUser] = useState<AppUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBadgeNotification, setShowBadgeNotification] = useState<string | null>(null);
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);
  const [showSimulationCenter, setShowSimulationCenter] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleSaveSettings = async (newPrefs: typeof preferences) => {
    if (user && userDoc) {
      setIsSavingSettings(true);
      try {
        await supabase
          .from('profiles')
          .update({ preferences: newPrefs })
          .eq('id', user.uid);
        setShowSettingsSaved(true);
        setTimeout(() => setShowSettingsSaved(false), 3000);
      } catch (error) {
        console.error('Error saving settings:', error);
      } finally {
        setIsSavingSettings(false);
      }
    }
  };

  const addRecentActivity = async (title: string, type: 'topic' | 'quiz' | 'simulation' | 'tool') => {
    if (user) {
      const newActivity = {
        title,
        type,
        timestamp: new Date().toISOString(),
        user_id: user.uid
      };
      try {
        await supabase.from('recent_activity').insert(newActivity);
      } catch (error) {
        console.error('Error adding recent activity:', error);
      }
    }
  };

  const handleCompleteTopic = async (topicId: string, xpReward: number) => {
    if (!user || !userDoc) return;
    
    const currentTopics = userDoc.completedTopics || [];
    if (currentTopics.includes(topicId)) return;
    
    const newTopics = [...currentTopics, topicId];
    const newPoints = userDoc.xp + xpReward;
    
    const newStats = {
      ...userDoc.stats,
      topicsCompleted: (userDoc.stats?.topicsCompleted || 0) + 1,
      actionsTaken: (userDoc.stats?.actionsTaken || 0) + 1
    };
    
    const newBadges = checkNewBadges(newStats, userDoc.badges || []);
    
    try {
      addRecentActivity(`Completed: ${topicId.replace(/_/g, ' ')}`, 'topic');
      
      await supabase
        .from('profiles')
        .update({
          completed_topics: newTopics,
          xp: newPoints,
          stats: newStats,
          badges: [...(userDoc.badges || []), ...newBadges]
        })
        .eq('id', user.uid);
      
      if (newBadges.length > 0) {
        setShowBadgeNotification(newBadges[0]);
        setTimeout(() => setShowBadgeNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error completing topic:', error);
    }
  };

  const handlePassQuiz = async (topicId: string, score: number) => {
    if (!user || !userDoc) return;
    
    const currentScores = userDoc.quizScores || {};
    const newScores = { ...currentScores, [topicId]: Math.max(score, currentScores[topicId] || 0) };
    
    const newStats = {
      ...userDoc.stats,
      quizzesPassed: (userDoc.stats?.quizzesPassed || 0) + 1,
      actionsTaken: (userDoc.stats?.actionsTaken || 0) + 1
    };
    
    const newBadges = checkNewBadges(newStats, userDoc.badges || []);
    
    try {
      addRecentActivity(`Passed Quiz: ${topicId.replace(/_/g, ' ')}`, 'quiz');
      
      await supabase
        .from('profiles')
        .update({
          quiz_scores: newScores,
          stats: newStats,
          badges: [...(userDoc.badges || []), ...newBadges]
        })
        .eq('id', user.uid);
      
      if (newBadges.length > 0) {
        setShowBadgeNotification(newBadges[0]);
        setTimeout(() => setShowBadgeNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error passing quiz:', error);
    }
  };

  const handleCompleteSimulation = async (scenarioId: string, xpReward: number, score: number) => {
    if (!user || !userDoc) return;
    
    const currentScores = userDoc.simulationScores || {};
    if (currentScores[scenarioId] === 100) return; // Already passed perfectly
    
    const newScores = { ...currentScores, [scenarioId]: Math.max(score, currentScores[scenarioId] || 0) };
    const newPoints = userDoc.xp + xpReward;
    
    const newStats = {
      ...userDoc.stats,
      simulationsCompleted: (userDoc.stats?.simulationsCompleted || 0) + 1,
      actionsTaken: (userDoc.stats?.actionsTaken || 0) + 1
    };
    
    const newBadges = checkNewBadges(newStats, userDoc.badges || []);
    
    try {
      addRecentActivity(`Completed Simulation: ${scenarioId.replace(/_/g, ' ')}`, 'simulation');
      
      await supabase
        .from('profiles')
        .update({
          simulation_scores: newScores,
          xp: newPoints,
          stats: newStats,
          badges: [...(userDoc.badges || []), ...newBadges]
        })
        .eq('id', user.uid);
      
      if (newBadges.length > 0) {
        setShowBadgeNotification(newBadges[0]);
        setTimeout(() => setShowBadgeNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error completing simulation:', error);
    }
  };

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [riskScore, setRiskScore] = useState(15);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Preferences State
  const [preferences, setPreferences] = useState({
    darkMode: true,
    highContrast: false,
    notifications: true,
    soundEffects: true,
    hapticFeedback: true
  });

  // Analyzers State
  const [passwordInput, setPasswordInput] = useState('');
  const [passAnalysis, setPassAnalysis] = useState<PasswordAnalysis | null>(null);
  
  const [phishingInput, setPhishingInput] = useState('');
  const [phishAnalysis, setPhishAnalysis] = useState<PhishingAnalysis | null>(null);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth & Profile Sync
  useEffect(() => {
    let profileSubscription: any;
    let chatSubscription: any;
    let activitySubscription: any;

    const handleSession = async (session: any) => {
      const supabaseUser = session?.user;
      console.log('App: handleSession triggered', { hasUser: !!supabaseUser, userId: supabaseUser?.id });
      
      if (supabaseUser) {
        const appUser: AppUser = {
          uid: supabaseUser.id,
          email: supabaseUser.email || '',
          displayName: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
          photoURL: supabaseUser.user_metadata?.avatar_url || ''
        };
        
        setUser(appUser);
        setIsGuest(false);
        
        // Check if profile exists
        try {
          console.log('App: Fetching profile for user:', supabaseUser.id);
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();

          if (fetchError) {
            console.log('App: Profile fetch error/result:', fetchError);
            if (fetchError.code === 'PGRST116') {
              console.log('App: Profile not found, needs onboarding');
              setNeedsOnboarding(true);
            } else {
              console.error('App: Unexpected profile fetch error:', fetchError);
            }
          } else if (existingProfile) {
            console.log('App: Profile found, skipping onboarding');
            setNeedsOnboarding(false);
            
            // Fix: Sync profile image from Google if missing in DB
            if (!existingProfile.profile_image && supabaseUser.user_metadata?.avatar_url) {
              console.log('App: Syncing profile image from Google metadata...');
              try {
                await supabase
                  .from('profiles')
                  .update({ profile_image: supabaseUser.user_metadata.avatar_url })
                  .eq('id', supabaseUser.id);
                existingProfile.profile_image = supabaseUser.user_metadata.avatar_url;
              } catch (err) {
                console.error('App: Error syncing profile image:', err);
              }
            }

            const mappedProfile: UserDocument = {
              uid: existingProfile.id,
              name: existingProfile.name,
              email: existingProfile.email,
              xp: existingProfile.xp,
              level: existingProfile.level,
              createdAt: existingProfile.created_at,
              profileImage: existingProfile.profile_image,
              badges: existingProfile.badges,
              completedTopics: existingProfile.completed_topics,
              quizScores: existingProfile.quiz_scores,
              simulationScores: existingProfile.simulation_scores,
              stats: existingProfile.stats,
              riskScore: existingProfile.risk_score,
              preferences: existingProfile.preferences
            };
            setUserDoc(mappedProfile);
            setEditDisplayName(mappedProfile.name);
            setEditPhotoURL(mappedProfile.profileImage || '');
            setRiskScore(mappedProfile.riskScore);
            if (mappedProfile.preferences) {
              setPreferences(mappedProfile.preferences);
            }
          }
        } catch (error) {
          console.error('App: Error in profile sync:', error);
        }

        // Listen to User Document (Realtime)
        if (profileSubscription) profileSubscription.unsubscribe();
        profileSubscription = supabase
          .channel(`public:profiles:${supabaseUser.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${supabaseUser.id}` }, (payload) => {
            const data = payload.new as any;
            if (data) {
              const mappedProfile: UserDocument = {
                uid: data.id,
                name: data.name,
                email: data.email,
                xp: data.xp,
                level: data.level,
                createdAt: data.created_at,
                profileImage: data.profile_image,
                badges: data.badges,
                completedTopics: data.completed_topics,
                quizScores: data.quiz_scores,
                simulationScores: data.simulation_scores,
                stats: data.stats,
                riskScore: data.risk_score,
                preferences: data.preferences
              };
              setUserDoc(mappedProfile);
              setNeedsOnboarding(false);
            }
          })
          .subscribe();

        // Initial fetch and Listen to Chat Sessions
        const fetchChatSessions = async () => {
          try {
            const { data, error } = await supabase
              .from('chat_sessions')
              .select('*')
              .eq('user_id', supabaseUser.id)
              .order('updated_at', { ascending: false });
            
            if (error) {
              if (error.code === 'PGRST116' || error.message.includes('relation "public.chat_sessions" does not exist')) {
                console.warn('Chat sessions table not found. Please run the SQL script.');
                return;
              }
              throw error;
            }

            if (data) {
              // Automatically delete empty chats (no user messages)
              const emptySessions = data.filter(s => !s.messages.some((m: any) => m.role === 'user'));
              if (emptySessions.length > 0) {
                console.log('App: Cleaning up empty sessions:', emptySessions.length);
                await supabase
                  .from('chat_sessions')
                  .delete()
                  .in('id', emptySessions.map(s => s.id));
              }

              const validSessions = data.filter(s => s.messages.some((m: any) => m.role === 'user'));
              setChatSessions(validSessions.map(s => ({
                id: s.id,
                title: s.title,
                updatedAt: s.updated_at,
                messages: s.messages
              })));
            }
          } catch (err) {
            console.error('Error fetching chat sessions:', err);
          }
        };
        fetchChatSessions();

        if (chatSubscription) chatSubscription.unsubscribe();
        chatSubscription = supabase
          .channel(`public:chat_sessions:${supabaseUser.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions', filter: `user_id=eq.${supabaseUser.id}` }, () => {
            fetchChatSessions();
          })
          .subscribe();

        // Initial fetch and Listen to Recent Activity
        const fetchRecentActivity = async () => {
          try {
            const { data, error } = await supabase
              .from('recent_activity')
              .select('*')
              .eq('user_id', supabaseUser.id)
              .order('timestamp', { ascending: false })
              .limit(5);
            
            if (error) {
              if (error.code === 'PGRST116' || error.message.includes('relation "public.recent_activity" does not exist')) {
                console.warn('Recent activity table not found. Please run the SQL script.');
                return;
              }
              throw error;
            }

            if (data) {
              setRecentActivity(data);
            }
          } catch (err) {
            console.error('Error fetching recent activity:', err);
          }
        };
        fetchRecentActivity();

        if (activitySubscription) activitySubscription.unsubscribe();
        activitySubscription = supabase
          .channel(`public:recent_activity:${supabaseUser.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'recent_activity', filter: `user_id=eq.${supabaseUser.id}` }, () => {
            fetchRecentActivity();
          })
          .subscribe();

      } else {
        console.log('App: No session found, clearing user state');
        setUser(null);
        setUserDoc(null);
        setIsGuest(false); // Show landing page if no session
        setNeedsOnboarding(false);
        setRiskScore(15);
        setRecentActivity([]);
        setChatSessions([]);
        if (profileSubscription) profileSubscription.unsubscribe();
        if (chatSubscription) chatSubscription.unsubscribe();
        if (activitySubscription) activitySubscription.unsubscribe();
      }
      console.log('App: Setting loading to false');
      setLoading(false);
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) profileSubscription.unsubscribe();
      if (chatSubscription) chatSubscription.unsubscribe();
      if (activitySubscription) activitySubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isTyping]);

  const trackAction = async (pointsToAdd: number, actionType: keyof NonNullable<UserDocument['stats']>, toolName?: string) => {
    if (!user || !userDoc) return;
    
    let newPoints = userDoc.xp + pointsToAdd;
    let newBadges = [...(userDoc.badges || [])];
    
    // Initialize stats if not present
    let stats = userDoc.stats || {
      aiQueries: 0,
      actionsTaken: 0,
      strongPasswords: 0,
      phishingDetected: 0,
      toolsUsed: [],
      simulationsCompleted: 0,
      topicsCompleted: 0,
      quizzesPassed: 0
    };

    // Update stats
    stats = { ...stats, actionsTaken: stats.actionsTaken + 1 };
    
    if (toolName && !stats.toolsUsed.includes(toolName)) {
      stats.toolsUsed = [...stats.toolsUsed, toolName];
    }
    
    if (actionType !== 'toolsUsed' && typeof stats[actionType] === 'number') {
      (stats[actionType] as number) += 1;
    }

    // Check for new badges
    const newlyUnlocked = checkNewBadges(stats, newBadges);
    
    if (newlyUnlocked.length > 0) {
      newBadges = [...newBadges, ...newlyUnlocked];
      // Show the first newly unlocked badge notification
      setShowBadgeNotification(newlyUnlocked[0]);
      setTimeout(() => setShowBadgeNotification(null), 3000);
    }
    
    const updatedProfile = { ...userDoc, xp: newPoints, badges: newBadges, stats };
    try {
      await supabase
        .from('profiles')
        .update({
          xp: newPoints,
          badges: newBadges,
          stats: stats
        })
        .eq('id', user.uid);
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const updateRiskScore = async (newScore: number) => {
    if (!user || !userDoc) return;
    try {
      await supabase
        .from('profiles')
        .update({ risk_score: newScore })
        .eq('id', user.uid);
    } catch (error) {
      console.error('Error updating risk score:', error);
    }
  };

  const handleLogin = () => {
    console.log('App: handleLogin called, setting showLogin to true');
    setShowLogin(true);
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      
      setUser(null);
      setUserDoc(null);
      setIsGuest(false);
      setShowLogin(false);
      setActiveTab('home');
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleResetProgress = async () => {
    if (!user || !userDoc) return;
    
    // Using a simpler check since window.confirm is restricted in iframes
    // In a real app we'd use a custom modal, but for now we'll just proceed
    // or the user can use the settings modal which we'll improve
    
    setIsResetting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          xp: 0,
          badges: [],
          risk_score: 15,
          stats: {
            aiQueries: 0,
            actionsTaken: 0,
            strongPasswords: 0,
            phishingDetected: 0,
            toolsUsed: [],
            simulationsCompleted: 0,
            topicsCompleted: 0,
            quizzesPassed: 0
          }
        })
        .eq('id', user.uid);
      
      if (error) throw error;
      toast.success("Progress Reset", {
        description: "Your training history has been cleared."
      });
    } catch (error: any) {
      console.error('Error resetting progress:', error);
      toast.error("Reset Failed", {
        description: error.message || "Could not reset progress."
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportData = () => {
    if (!user || !userDoc) return;
    setIsExporting(true);
    try {
      const data = {
        userEmail: userDoc.email,
        userXP: userDoc.xp,
        userStats: userDoc.stats,
        userBadges: userDoc.badges || [],
        completedTopics: userDoc.completedTopics || [],
        quizScores: userDoc.quizScores || {},
        simulationScores: userDoc.simulationScores || {},
        chatSessions: chatSessions,
        riskScore: userDoc.riskScore,
        recentActivity: recentActivity,
        preferences: userDoc.preferences
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credentia-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // Profile Image Upload (Base64 resize)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setEditPhotoURL(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!user || !userDoc) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editDisplayName || userDoc.name,
          profile_image: editPhotoURL || userDoc.profileImage || ''
        })
        .eq('id', user.uid);
      
      if (error) throw error;

      setIsEditingProfile(false);
      toast.success('Profile Updated', {
        description: 'Your agent identity has been updated.'
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Update Failed', {
        description: error.message || 'Could not save profile changes.'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onAnalyzePassword = () => {
    const result = analyzePassword(passwordInput);
    setPassAnalysis(result);
    updateRiskScore(Math.min(100, Math.max(0, riskScore + (result.score < 50 ? 10 : -5))));
    
    if (result.score > 80) {
      trackAction(20, 'strongPasswords', 'password');
    } else {
      trackAction(5, 'actionsTaken', 'password');
    }
    addRecentActivity('Password Analyzed', 'tool');
  };

  const onAnalyzePhishing = () => {
    const result = analyzePhishing(phishingInput);
    setPhishAnalysis(result);
    updateRiskScore(Math.min(100, Math.max(0, riskScore + (result.suspicious ? 15 : -2))));
    
    if (result.suspicious) {
      trackAction(15, 'phishingDetected', 'phishing');
    } else {
      trackAction(5, 'actionsTaken', 'phishing');
    }
    addRecentActivity('Phishing Analyzed', 'tool');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = [
    "How to spot phishing?",
    "Check my password strength",
    "What is 2FA?",
    "Secure my Wi-Fi"
  ];

  console.log('App: Rendering', { loading, hasUser: !!user, needsOnboarding, hasUserDoc: !!userDoc });

  if (loading) {
    console.log('App: Rendering loading state');
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Logo size="xl" glow />
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-cyber-blue animate-spin" />
            <span className="text-cyber-blue font-mono text-sm tracking-widest uppercase">Initializing Secure Session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (user && needsOnboarding) {
    console.log('App: Rendering Onboarding component');
    return (
      <Onboarding 
        user={user} 
        onComplete={(doc) => {
          console.log('App: onComplete called with doc:', doc);
          setUserDoc(doc);
          setNeedsOnboarding(false);
          console.log('App: needsOnboarding set to false');
        }} 
      />
    );
  }

  if (showLogin) {
    return (
      <Login 
        onBack={() => setShowLogin(false)} 
        onSuccess={() => {
          setShowLogin(false);
          setIsGuest(false);
        }} 
      />
    );
  }

  if (!user && !isGuest) {
    return <LandingPage onLogin={() => setShowLogin(true)} onGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-cyber-bg text-white overflow-hidden border-x border-white/10 shadow-2xl relative">
      
      {/* Badge Notification Overlay */}
      <AnimatePresence>
        {showBadgeNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-24 left-4 right-4 z-50 bg-cyber-card border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center gap-4"
          >
            {(() => {
              const badgeDef = BADGE_DEFINITIONS.find(b => b.id === showBadgeNotification);
              const Icon = badgeDef?.icon || Award;
              return (
                <>
                  <div className={cn("p-3 rounded-full border-2", badgeDef?.colorClass || "text-cyber-yellow border-cyber-yellow/50 bg-cyber-yellow/20")}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className={cn("text-xs font-bold uppercase tracking-wider", badgeDef ? badgeDef.colorClass.split(' ')[0] : "text-cyber-yellow")}>Badge Unlocked!</p>
                    <p className="text-lg font-bold">{showBadgeNotification}</p>
                    {badgeDef && <p className="text-[10px] text-white/50">{badgeDef.description}</p>}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Saved Notification Overlay */}
      <AnimatePresence>
        {showSettingsSaved && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-24 left-4 right-4 z-50 bg-cyber-card border border-cyber-green/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(74,222,128,0.3)] flex items-center gap-4 justify-center"
          >
            <CheckCircle2 className="w-6 h-6 text-cyber-green" />
            <p className="text-sm font-bold">Settings Saved Successfully</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-cyber-card border border-white/10 rounded-3xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-cyber-blue/50 bg-cyber-bg flex items-center justify-center">
                      {editPhotoURL ? (
                        <img src={editPhotoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-white/30" />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <p className="text-[10px] text-white/40 mt-2">Click to upload photo</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyber-blue/50"
                    placeholder="Enter your agent name"
                    maxLength={20}
                  />
                </div>

                <button 
                  onClick={saveProfile}
                  disabled={isSavingProfile}
                  className="w-full bg-cyber-blue text-black font-bold py-3 rounded-xl hover:bg-cyber-blue/80 transition-colors disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-4 pt-10 border-b border-white/10 bg-cyber-bg/80 backdrop-blur-md z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setIsEditingProfile(true)}
              className="w-10 h-10 rounded-full overflow-hidden border border-cyber-blue/30 cyber-glow bg-black flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            >
              {userDoc?.profileImage ? (
                <img src={userDoc.profileImage} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-cyber-blue" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Logo size="sm" glow />
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">
                  {userDoc?.name || 'CREDENTIA'}
                </h1>
                <p className="text-[10px] text-cyber-blue font-semibold uppercase tracking-[0.2em] mt-1">
                  Agent Level {userDoc?.level || 1}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowChatPanel(true)}
              className="p-2 bg-cyber-blue/10 text-cyber-blue rounded-full hover:bg-cyber-blue/20 transition-colors relative"
            >
              <MessageSquare className="w-5 h-5" />
              {chatSessions.length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-cyber-red rounded-full border-2 border-cyber-bg" />
              )}
            </button>
            {user ? (
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleLogin}
                className="p-2 text-cyber-blue hover:text-white transition-colors"
                title="Log In"
              >
                <LogIn className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6", "pb-24")}>
        {showSimulationCenter ? (
          <SimulationCenter 
            userDoc={userDoc}
            onCompleteSimulation={handleCompleteSimulation}
            onClose={() => setShowSimulationCenter(false)}
          />
        ) : activeTab === 'home' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* User Welcome */}
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">
                    {user && userDoc ? `Welcome back, ${userDoc.name}` : "Welcome, Guest"}
                  </h2>
                  {user ? (
                    <div className="flex items-center gap-1 bg-cyber-green/10 border border-cyber-green/30 px-2 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
                      <span className="text-[8px] font-bold text-cyber-green uppercase tracking-tighter">Secure</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Guest</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-white/40">
                  {user ? "Your security profile is synced" : "Login to save your progress"}
                </p>
              </div>
              {user && userDoc && (
                <div className="relative group cursor-pointer" onClick={() => setIsEditingProfile(true)}>
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyber-blue/30 group-hover:border-cyber-blue transition-colors bg-cyber-card flex items-center justify-center">
                    {userDoc.profileImage ? (
                      <img src={userDoc.profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-6 h-6 text-white/30" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-cyber-blue text-black p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>

            {/* Security Score */}
            <section className="bg-cyber-card p-6 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Logo size="xl" className="opacity-20 grayscale" />
              </div>
              <div className="z-10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-2">Security Score</h3>
                <p className="text-[10px] text-white/50 max-w-[200px] leading-relaxed">
                  Based on your learning progress, quiz scores, and tool usage.
                </p>
              </div>
              <div className="z-10">
                <RiskMeter score={100 - riskScore} />
              </div>
            </section>

            {/* Learning Progress Summary */}
            <section className="bg-gradient-to-r from-cyber-card to-cyber-bg p-5 rounded-3xl border border-cyber-blue/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-cyber-blue font-bold tracking-wider mb-1">Learning Progress</p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{userDoc?.completedTopics?.length || 0}</span>
                  <span className="text-xs text-white/50 mb-1">/ 50 Topics</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="text-right">
                  <p className="text-[10px] uppercase text-cyber-yellow font-bold tracking-wider mb-1">Cyber XP</p>
                  <div className="flex items-end gap-1 justify-end">
                    <span className="text-xl font-bold">{userDoc?.xp || 0}</span>
                    <span className="text-xs text-white/50 mb-1">pts</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Access Cards */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/30 px-2">Quick Access</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('learningHub')}
                  className="bg-cyber-card p-5 rounded-3xl border border-white/5 hover:border-cyber-blue/50 transition-all flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-full bg-cyber-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 text-cyber-blue" />
                  </div>
                  <span className="text-sm font-bold">Learning Hub</span>
                </button>
                <button 
                  onClick={() => setActiveTab('tools')}
                  className="bg-cyber-card p-5 rounded-3xl border border-white/5 hover:border-cyber-purple/50 transition-all flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-full bg-cyber-purple/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wrench className="w-6 h-6 text-cyber-purple" />
                  </div>
                  <span className="text-sm font-bold">Security Tools</span>
                </button>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/30 px-2">Recent Activity</h3>
              <div className="bg-cyber-card rounded-3xl border border-white/5 overflow-hidden">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={activity.id} className={cn("p-4 flex items-center gap-3", index !== recentActivity.length - 1 && "border-b border-white/5")}>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        activity.type === 'topic' ? "bg-cyber-yellow/10 text-cyber-yellow" :
                        activity.type === 'quiz' ? "bg-cyber-green/10 text-cyber-green" :
                        activity.type === 'simulation' ? "bg-cyber-purple/10 text-cyber-purple" :
                        "bg-cyber-blue/10 text-cyber-blue"
                      )}>
                        {activity.type === 'topic' ? <BookOpen className="w-4 h-4" /> :
                         activity.type === 'quiz' ? <Award className="w-4 h-4" /> :
                         activity.type === 'simulation' ? <Shield className="w-4 h-4" /> :
                         <Bot className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-white/40">
                          {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-white/50 text-sm">
                    No recent activity. Start learning to earn XP!
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        ) : activeTab === 'tools' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="px-2">
              <h2 className="text-xl font-bold">Security Tools</h2>
              <p className="text-xs text-white/40">Analyze threats, passwords, and phishing attempts.</p>
            </div>

            {/* Simulation Center Banner */}
            <section className="bg-gradient-to-r from-orange-500/20 to-cyber-card p-6 rounded-3xl border border-orange-500/30 relative overflow-hidden group cursor-pointer" onClick={() => setShowSimulationCenter(true)}>
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity group-hover:scale-110 duration-500">
                <ShieldAlert className="w-24 h-24 text-orange-400" />
              </div>
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-orange-400" />
                  Cyber Attack Simulator
                </h2>
                <p className="text-sm text-white/70 mb-4 max-w-[80%]">Test your skills against real-world threats like phishing and social engineering.</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-black font-bold rounded-xl text-sm hover:bg-orange-400 transition-colors">
                  <PlayCircle className="w-4 h-4" /> Start Simulation
                </div>
              </div>
            </section>

            {/* Analyzers */}
            <section className="space-y-4">
              <div className="bg-cyber-card p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                {/* Points indicator */}
                <div className="absolute top-4 right-4 text-[10px] text-cyber-blue font-bold flex items-center gap-1 bg-cyber-blue/10 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3" /> +XP
                </div>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyber-blue" />
                  Password Analyzer
                </h3>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="password"
                    placeholder="Enter password to test..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyber-blue/50"
                  />
                  <button 
                    onClick={onAnalyzePassword}
                    className="bg-cyber-blue text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-cyber-blue/80 transition-colors"
                  >
                    Test
                  </button>
                </div>
                {passAnalysis && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/50">Strength:</span>
                      <span className={cn(
                        "text-xs font-bold",
                        passAnalysis.strength === 'Strong' ? "text-cyber-green" :
                        passAnalysis.strength === 'Medium' ? "text-cyber-yellow" : "text-cyber-red"
                      )}>{passAnalysis.strength}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${passAnalysis.score}%` }}
                        className={cn(
                          "h-full",
                          passAnalysis.score > 80 ? "bg-cyber-green" :
                          passAnalysis.score > 40 ? "bg-cyber-yellow" : "bg-cyber-red"
                        )}
                      />
                    </div>
                    <p className="text-[10px] text-white/40 italic">Estimated crack time: {passAnalysis.crackTime}</p>
                    {passAnalysis.suggestions.length > 0 && (
                      <ul className="text-[10px] space-y-1">
                        {passAnalysis.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-1 text-cyber-yellow">
                            <ChevronRight className="w-3 h-3 mt-0.5" /> {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="bg-cyber-card p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                {/* Points indicator */}
                <div className="absolute top-4 right-4 text-[10px] text-cyber-yellow font-bold flex items-center gap-1 bg-cyber-yellow/10 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3" /> +XP
                </div>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-cyber-yellow" />
                  Phishing Detector
                </h3>
                <textarea 
                  placeholder="Paste message or link here..."
                  value={phishingInput}
                  onChange={(e) => setPhishingInput(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyber-yellow/50 h-20 mb-3 resize-none"
                />
                <button 
                  onClick={onAnalyzePhishing}
                  className="w-full bg-cyber-yellow text-black font-bold py-2 rounded-xl text-sm hover:bg-cyber-yellow/80 transition-colors"
                >
                  Scan Content
                </button>
                {phishAnalysis && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {phishAnalysis.suspicious ? (
                        <XCircle className="w-5 h-5 text-cyber-red" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-cyber-green" />
                      )}
                      <span className="text-sm font-bold">Risk: {phishAnalysis.riskLevel}</span>
                    </div>
                    {phishAnalysis.reasons.map((r, i) => (
                      <p key={i} className="text-[10px] text-cyber-red bg-cyber-red/5 p-2 rounded-lg border border-cyber-red/10">{r}</p>
                    ))}
                    <div className="pt-2">
                      <p className="text-[10px] font-bold uppercase text-white/30 mb-2">Prevention Tips</p>
                      <ul className="text-[10px] space-y-1">
                        {phishAnalysis.tips.map((t, i) => (
                          <li key={i} className="flex items-start gap-1 text-cyber-blue">
                            <ChevronRight className="w-3 h-3 mt-0.5" /> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>
            
            <p className="text-[10px] text-center text-white/20 pb-4">
              CREDENTIA Cyber AI Mentor • For educational purposes only
            </p>
          </motion.div>
        ) : activeTab === 'learningHub' ? (
          <LearningHub 
            userDoc={userDoc} 
            onCompleteTopic={handleCompleteTopic}
            onPassQuiz={handlePassQuiz}
          />
        ) : activeTab === 'profile' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 pb-20"
          >
            {!user || !userDoc ? (
              <div className="bg-cyber-card p-6 rounded-2xl border border-white/5 text-center mt-6">
                <Lock className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/60">Log in to view your profile and badges.</p>
                <button 
                  onClick={handleLogin}
                  className="mt-4 bg-cyber-blue text-black font-bold px-6 py-2 rounded-xl text-sm hover:bg-cyber-blue/80 transition-colors"
                >
                  Log In
                </button>
              </div>
            ) : (
              <>
                {/* Top Section: Profile Info */}
                <section className="bg-cyber-card p-6 rounded-3xl border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-cyber-blue/20 to-transparent opacity-50" />
                  
                  <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-20 bg-black/20 rounded-full backdrop-blur-sm"
                  >
                    <Settings className="w-6 h-6" />
                  </button>

                  <div className="relative group cursor-pointer mt-4" onClick={() => setIsEditingProfile(true)}>
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-cyber-bg shadow-[0_0_20px_rgba(0,255,255,0.2)] bg-cyber-card flex items-center justify-center z-10 relative">
                      {userDoc?.profileImage ? (
                        <img src={userDoc.profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-12 h-12 text-white/30" />
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-cyber-blue text-black p-2 rounded-full z-20 shadow-lg">
                      <Edit2 className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold mt-4">{userDoc?.name || 'Cyber Agent'}</h2>
                  <p className="text-sm text-cyber-blue font-bold uppercase tracking-widest mt-1">
                    {(() => {
                      const xp = userDoc?.xp || 0;
                      if (xp > 1000) return 'Master';
                      if (xp > 500) return 'Expert';
                      if (xp > 100) return 'Intermediate';
                      return 'Cyber Recruit';
                    })()}
                  </p>
                  
                  <div className="flex gap-6 mt-6 w-full justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{userDoc?.xp || 0}</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Total XP</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {(() => {
                          const xp = userDoc?.xp || 0;
                          if (xp > 1000) return '1';
                          if (xp > 500) return '2';
                          if (xp > 100) return '3';
                          return '-';
                        })()}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Rank</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <p className="text-2xl font-bold">{userDoc?.badges?.length || 0}</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Badges</p>
                    </div>
                  </div>
                </section>

                {/* Middle Section: Badges */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/30 px-2">Badges Earned</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {BADGE_DEFINITIONS.map((badge) => {
                      const isUnlocked = userDoc?.badges?.includes(badge.id);
                      const Icon = badge.icon;
                      
                      return (
                        <div 
                          key={badge.id}
                          className={cn(
                            "bg-cyber-card p-3 rounded-2xl border transition-all flex flex-col items-center text-center relative overflow-hidden aspect-square justify-center",
                            isUnlocked ? "border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]" : "border-white/5 opacity-40 grayscale"
                          )}
                        >
                          {isUnlocked && (
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                          )}
                          <div className={cn(
                            "w-10 h-10 flex items-center justify-center mb-2 border-2",
                            badge.shapeClass,
                            isUnlocked ? badge.colorClass : "bg-black/50 border-white/10 text-white/30"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <h3 className="text-[10px] font-bold leading-tight">{badge.name}</h3>
                        </div>
                      );
                    })}
                  </div>
                </section>
                
                <div className="pt-4">
                  <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full bg-cyber-card border border-cyber-red/30 text-cyber-red font-bold py-3 rounded-xl text-sm hover:bg-cyber-red/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </main>

      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        onResetProgress={handleResetProgress}
        preferences={preferences}
        onSavePreferences={(prefs) => {
          setPreferences(prefs);
          handleSaveSettings(prefs);
        }}
        onExportData={handleExportData}
        isExporting={isExporting}
        isResetting={isResetting}
        isSavingSettings={isSavingSettings}
      />

      {/* Floating AI Mentor Button */}
      <button
        onClick={() => setShowChatPanel(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-cyber-blue/20 border border-cyber-blue/50 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.4)] flex items-center justify-center hover:scale-110 transition-transform z-30 overflow-hidden"
      >
        <Logo size="sm" variant="ai" glow />
      </button>

      {/* Chat Panel Overlay */}
      <AnimatePresence>
        {showChatPanel && (
          <ChatPanel
            isOpen={showChatPanel}
            onClose={() => setShowChatPanel(false)}
            userUid={user?.uid}
            chatSessions={chatSessions}
            onSessionUpdate={async (session) => {
              console.log('App: onSessionUpdate called for session:', session.id, 'Title:', session.title);
              
              // Optimistic update
              setChatSessions(prev => {
                const index = prev.findIndex(s => s.id === session.id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = session;
                  const sorted = updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                  console.log('App: Updated existing session in state');
                  return sorted;
                }
                console.log('App: Added new session to state');
                return [session, ...prev];
              });

              if (user) {
                try {
                  // ONLY SAVE IF THERE IS USER INTERACTION (at least one user message)
                  const hasUserMessage = session.messages.some(m => m.role === 'user');
                  
                  if (!hasUserMessage) {
                    console.log('App: Session is empty (no user messages), skipping database save');
                    return;
                  }

                  console.log('App: Upserting session to Supabase...', session.id);
                  const { error } = await supabase
                    .from('chat_sessions')
                    .upsert({
                      id: session.id,
                      user_id: user.uid,
                      title: session.title,
                      updated_at: session.updatedAt,
                      messages: session.messages
                    });
                  
                  if (error) {
                    console.error('App: Supabase upsert error:', error);
                    toast.error('Failed to save chat: ' + error.message);
                  } else {
                    console.log('App: Session upserted successfully');
                  }
                } catch (error) {
                  console.error('App: Error updating chat session:', error);
                  toast.error('An unexpected error occurred while saving chat');
                }
              } else {
                console.warn('App: No user found, session not saved to database');
              }
            }}
            onSessionDelete={async (sessionId) => {
              // Optimistic update
              setChatSessions(prev => prev.filter(s => s.id !== sessionId));

              if (user) {
                try {
                  await supabase
                    .from('chat_sessions')
                    .delete()
                    .eq('id', sessionId)
                    .eq('user_id', user.uid); // Ensure only user's own chats are deleted
                } catch (error) {
                  console.error('Error deleting chat session:', error);
                }
              }
            }}
            onMessageSent={(text) => {
              updateRiskScore(Math.min(100, Math.max(0, riskScore + (text.length % 5))));
              trackAction(2, 'aiQueries', 'chat');
              addRecentActivity('AI Mentor Chat', 'tool');
            }}
          />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-cyber-card/90 backdrop-blur-xl border-t border-white/10 p-2 flex justify-around items-center z-20">
        <button 
          onClick={() => { setActiveTab('home'); setShowSimulationCenter(false); }}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
            activeTab === 'home' && !showSimulationCenter ? "text-cyber-blue" : "text-white/30"
          )}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        <button 
          onClick={() => { setActiveTab('learningHub'); setShowSimulationCenter(false); }}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
            activeTab === 'learningHub' && !showSimulationCenter ? "text-cyber-blue" : "text-white/30"
          )}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Learning Hub</span>
        </button>
        <button 
          onClick={() => { setActiveTab('tools'); setShowSimulationCenter(false); }}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
            activeTab === 'tools' && !showSimulationCenter ? "text-cyber-blue" : "text-white/30"
          )}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Tools</span>
        </button>
        <button 
          onClick={() => { setActiveTab('profile'); setShowSimulationCenter(false); }}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
            activeTab === 'profile' && !showSimulationCenter ? "text-cyber-blue" : "text-white/30"
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </button>
      </nav>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-cyber-card border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4 text-cyber-red">
                <LogOut className="w-6 h-6" />
                <h3 className="text-xl font-bold">Confirm Logout</h3>
              </div>
              <p className="text-white/70 mb-6">
                Are you sure you want to log out? Your session will be ended.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleLogout();
                    setShowLogoutConfirm(false);
                  }}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 rounded-xl bg-cyber-red text-white font-bold hover:bg-cyber-red/80 transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? 'Logging Out...' : 'Log Out'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}
