import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Shield, Lock, Key, Eye, AlertTriangle, Server, Globe, Database, Cpu, Wifi, CheckCircle, ArrowLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { LEARNING_TOPICS } from '../data/learningTopics';
import { Topic, UserDocument } from '../types';

interface LearningHubProps {
  userDoc: UserDocument | null;
  onCompleteTopic: (topicId: string, xpReward: number) => void;
  onPassQuiz: (topicId: string, score: number) => void;
}

const ICONS: Record<string, React.ElementType> = {
  Shield, Lock, Key, Eye, AlertTriangle, Server, Globe, Database, Cpu, Wifi, BookOpen
};

export function LearningHub({ userDoc, onCompleteTopic, onPassQuiz }: LearningHubProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Topic | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  const completedTopics = userDoc?.completedTopics || [];
  const quizScores = userDoc?.quizScores || {};

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  const handleBack = () => {
    setSelectedTopic(null);
    setActiveQuiz(null);
    setShowQuizResult(false);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
  };

  const startQuiz = () => {
    setActiveQuiz(selectedTopic);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setShowQuizResult(false);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
  };

  const handleAnswerSubmit = (index: number) => {
    if (selectedAnswer !== null || !activeQuiz) return;
    
    setSelectedAnswer(index);
    const correct = index === activeQuiz.quiz[currentQuestionIndex].correctAnswerIndex;
    setIsAnswerCorrect(correct);
    
    if (correct) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (!activeQuiz) return;
    
    if (currentQuestionIndex < activeQuiz.quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
    } else {
      setShowQuizResult(true);
      const percentage = (quizScore / activeQuiz.quiz.length) * 100;
      if (percentage >= 70) {
        onPassQuiz(activeQuiz.id, percentage);
        if (!completedTopics.includes(activeQuiz.id)) {
          onCompleteTopic(activeQuiz.id, 50); // 50 XP for completing a topic
        }
      }
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Intermediate': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'Advanced': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'Expert': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  if (showQuizResult && activeQuiz) {
    const percentage = (quizScore / activeQuiz.quiz.length) * 100;
    const passed = percentage >= 70;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <button onClick={handleBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Hub
        </button>

        <div className="bg-cyber-card p-8 rounded-2xl border border-white/5 text-center space-y-6">
          <div className={cn(
            "w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4",
            passed ? "border-green-500/50 bg-green-500/10 text-green-400" : "border-red-500/50 bg-red-500/10 text-red-400"
          )}>
            {passed ? <CheckCircle className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
          </div>
          
          <div>
            <h2 className="text-2xl font-bold">{passed ? 'Quiz Passed!' : 'Quiz Failed'}</h2>
            <p className="text-white/60 mt-2">You scored {quizScore} out of {activeQuiz.quiz.length} ({Math.round(percentage)}%)</p>
          </div>

          {passed ? (
            <div className="bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl p-4 text-cyber-blue">
              <p className="font-bold">+50 XP Earned</p>
              <p className="text-xs opacity-80">Topic marked as completed.</p>
            </div>
          ) : (
            <p className="text-sm text-white/50">You need at least 70% to pass. Review the material and try again.</p>
          )}

          <div className="flex gap-4 justify-center pt-4">
            <button 
              onClick={startQuiz}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
            >
              Retry Quiz
            </button>
            <button 
              onClick={handleBack}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-cyber-blue text-black hover:bg-cyber-blue/90 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              Continue Learning
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (activeQuiz) {
    const question = activeQuiz.quiz[currentQuestionIndex];
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <button onClick={() => setActiveQuiz(null)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Exit Quiz
          </button>
          <span className="text-xs font-bold text-white/50 bg-white/5 px-3 py-1 rounded-full">
            Question {currentQuestionIndex + 1} of {activeQuiz.quiz.length}
          </span>
        </div>

        <div className="bg-cyber-card p-6 rounded-2xl border border-white/5 space-y-6">
          <h2 className="text-xl font-bold leading-relaxed">{question.question}</h2>
          
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === question.correctAnswerIndex;
              const showCorrect = selectedAnswer !== null && isCorrect;
              const showWrong = isSelected && !isCorrect;

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSubmit(idx)}
                  disabled={selectedAnswer !== null}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between",
                    selectedAnswer === null ? "border-white/10 hover:border-cyber-blue/50 hover:bg-cyber-blue/5" :
                    showCorrect ? "border-green-500 bg-green-500/10 text-green-400" :
                    showWrong ? "border-red-500 bg-red-500/10 text-red-400" :
                    "border-white/5 opacity-50"
                  )}
                >
                  <span>{option}</span>
                  {showCorrect && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {showWrong && <AlertTriangle className="w-5 h-5 text-red-400" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {selectedAnswer !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 space-y-4"
              >
                <div className={cn(
                  "p-4 rounded-xl border text-sm",
                  isAnswerCorrect ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                  <p className="font-bold mb-1">{isAnswerCorrect ? 'Correct!' : 'Incorrect'}</p>
                  <p className="opacity-90">{question.explanation}</p>
                </div>
                
                <button
                  onClick={nextQuestion}
                  className="w-full py-4 rounded-xl font-bold bg-cyber-blue text-black hover:bg-cyber-blue/90 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  {currentQuestionIndex < activeQuiz.quiz.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  if (selectedTopic) {
    const Icon = ICONS[selectedTopic.icon] || BookOpen;
    const isCompleted = completedTopics.includes(selectedTopic.id);
    const score = quizScores[selectedTopic.id];

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 pb-24"
      >
        <button onClick={handleBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Hub
        </button>

        <div className="bg-cyber-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-start gap-4">
            <div className={cn("p-4 rounded-xl", getLevelColor(selectedTopic.level))}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", getLevelColor(selectedTopic.level))}>
                  {selectedTopic.level}
                </span>
                {isCompleted && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-green-500/50 bg-green-500/10 text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{selectedTopic.title}</h1>
            </div>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-bold text-cyber-blue uppercase tracking-wider mb-2">Simple Explanation</h3>
              <p className="text-white/70 leading-relaxed italic text-lg">"{selectedTopic.simpleExplanation}"</p>
            </section>

            <section className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Why It Matters
              </h3>
              <p className="text-white/90 leading-relaxed font-medium">{selectedTopic.whyItMatters}</p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-cyber-blue uppercase tracking-wider mb-2">Detailed Overview</h3>
              <p className="text-white/70 leading-relaxed">{selectedTopic.explanation}</p>
            </section>

            <section className="bg-white/5 p-4 rounded-xl border border-white/10">
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Real-World Example
              </h3>
              <p className="text-white/70 leading-relaxed italic">"{selectedTopic.realWorldExample}"</p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Security Tips
              </h3>
              <ul className="space-y-2">
                {selectedTopic.securityTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/70">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold">Knowledge Check</h3>
                <p className="text-xs text-white/50">{selectedTopic.quiz.length} questions • 50 XP Reward</p>
              </div>
              {score !== undefined && (
                <div className="text-right">
                  <span className="text-xs text-white/50 uppercase">Previous Score</span>
                  <p className={cn("font-bold", score >= 70 ? "text-green-400" : "text-red-400")}>{score}%</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={startQuiz}
              className="w-full py-4 rounded-xl font-bold bg-cyber-blue text-black hover:bg-cyber-blue/90 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              {score !== undefined ? 'Retake Quiz' : 'Start Quiz'}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const chapters = Array.from(new Set(LEARNING_TOPICS.map(t => t.chapterId))).map(id => {
    const topics = LEARNING_TOPICS.filter(t => t.chapterId === id);
    return {
      id,
      title: topics[0].chapterTitle,
      topics
    };
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyber-blue" />
            Learning Hub
          </h2>
          <p className="text-sm text-white/50 mt-1">Master cybersecurity concepts</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-cyber-blue">{completedTopics.length}<span className="text-sm text-white/30">/{LEARNING_TOPICS.length}</span></div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">Total Completed</div>
        </div>
      </div>

      <div className="px-2">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-cyber-blue"
            initial={{ width: 0 }}
            animate={{ width: `${(completedTopics.length / LEARNING_TOPICS.length) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="text-right mt-1 text-xs text-white/50">
          {Math.round((completedTopics.length / LEARNING_TOPICS.length) * 100)}% Total Progress
        </div>
      </div>

      <div className="space-y-8">
        {chapters.map((chapter, chapterIndex) => {
          const chapterCompletedTopics = chapter.topics.filter(t => completedTopics.includes(t.id));
          const chapterProgress = (chapterCompletedTopics.length / chapter.topics.length) * 100;

          return (
            <div key={chapter.id} className="space-y-4">
              <div className="px-2">
                <h3 className="text-lg font-bold text-white mb-1">Chapter {chapterIndex + 1}: {chapter.title}</h3>
                <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                  <span>{Math.round(chapterProgress)}% of Chapter {chapterIndex + 1} Complete</span>
                  <span>{chapterCompletedTopics.length}/{chapter.topics.length}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-cyber-blue/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${chapterProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {chapter.topics.map((topic, index) => {
                  const Icon = ICONS[topic.icon] || BookOpen;
                  const isCompleted = completedTopics.includes(topic.id);
                  const score = quizScores[topic.id];
                  
                  // Find the global index of this topic to determine if it's unlocked
                  const globalIndex = LEARNING_TOPICS.findIndex(t => t.id === topic.id);
                  const isUnlocked = globalIndex === 0 || completedTopics.includes(LEARNING_TOPICS[globalIndex - 1].id);

                  return (
                    <button
                      key={topic.id}
                      onClick={() => isUnlocked && handleTopicClick(topic)}
                      disabled={!isUnlocked}
                      className={cn(
                        "bg-cyber-card p-4 rounded-2xl border transition-all text-left flex items-center gap-4 group relative overflow-hidden",
                        isUnlocked ? "border-white/5 hover:border-cyber-blue/30 cursor-pointer" : "border-white/5 opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isCompleted && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 blur-xl rounded-full translate-x-1/2 -translate-y-1/2" />
                      )}
                      
                      <div className={cn("p-3 rounded-xl shrink-0 transition-colors", isUnlocked ? getLevelColor(topic.level) : "bg-gray-800 text-gray-500")}>
                        {isUnlocked ? <Icon className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", isUnlocked ? getLevelColor(topic.level) : "border-gray-700 text-gray-500")}>
                            {topic.level}
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> {score}%
                            </span>
                          )}
                        </div>
                        <h3 className={cn("font-bold truncate transition-colors", isUnlocked ? "group-hover:text-cyber-blue" : "text-gray-500")}>{topic.title}</h3>
                      </div>
                      
                      {isUnlocked && <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-cyber-blue transition-colors shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
