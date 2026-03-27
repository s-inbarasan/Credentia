import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertTriangle, CheckCircle, XCircle, ArrowLeft, PlayCircle, ShieldAlert, Zap } from 'lucide-react';
import { cn } from '../utils/cn';
import { SIMULATION_SCENARIOS } from '../data/simulations';
import { SimulationScenario, UserDocument } from '../types';

interface SimulationCenterProps {
  userDoc: UserDocument | null;
  onCompleteSimulation: (scenarioId: string, xpReward: number, score: number) => void;
  onClose: () => void;
}

export function SimulationCenter({ userDoc, onCompleteSimulation, onClose }: SimulationCenterProps) {
  const [activeScenario, setActiveScenario] = useState<SimulationScenario | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<'Safe' | 'Suspicious' | 'Malicious' | null>(null);
  const [showResult, setShowResult] = useState(false);

  const completedSimulations = userDoc?.stats?.simulationsCompleted || 0;
  const simulationScores = userDoc?.simulationScores || {};

  const handleStart = (scenario: SimulationScenario) => {
    setActiveScenario(scenario);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleBack = () => {
    setActiveScenario(null);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleSubmit = (answer: 'Safe' | 'Suspicious' | 'Malicious') => {
    if (selectedAnswer !== null || !activeScenario) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === activeScenario.correctAnswer;
    if (isCorrect && !simulationScores[activeScenario.id]) {
      onCompleteSimulation(activeScenario.id, activeScenario.xpReward, 100);
    } else if (!simulationScores[activeScenario.id]) {
      onCompleteSimulation(activeScenario.id, 0, 0);
    }
  };

  if (activeScenario) {
    const isCorrect = selectedAnswer === activeScenario.correctAnswer;

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 pb-24"
      >
        <button onClick={handleBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Simulations
        </button>

        <div className="bg-cyber-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center gap-4 border-b border-white/10 pb-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-orange-400 tracking-wider bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                {activeScenario.type}
              </span>
              <h2 className="text-xl font-bold mt-1">{activeScenario.title}</h2>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-white/70 leading-relaxed">{activeScenario.description}</p>
            
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-sm text-white/80 whitespace-pre-wrap">
              {activeScenario.content}
            </div>
          </div>

          {!showResult ? (
            <div className="space-y-4 pt-4">
              <h3 className="font-bold text-center mb-4">Analyze the scenario and classify it:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleSubmit('Safe')}
                  className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-400 font-bold transition-all flex flex-col items-center gap-2"
                >
                  <CheckCircle className="w-6 h-6" /> Safe
                </button>
                <button
                  onClick={() => handleSubmit('Suspicious')}
                  className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-400 font-bold transition-all flex flex-col items-center gap-2"
                >
                  <AlertTriangle className="w-6 h-6" /> Suspicious
                </button>
                <button
                  onClick={() => handleSubmit('Malicious')}
                  className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold transition-all flex flex-col items-center gap-2"
                >
                  <XCircle className="w-6 h-6" /> Malicious
                </button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 pt-4 border-t border-white/10"
            >
              <div className={cn(
                "p-6 rounded-xl border text-center space-y-2",
                isCorrect ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
              )}>
                <div className="flex justify-center mb-2">
                  {isCorrect ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                </div>
                <h3 className="text-xl font-bold">{isCorrect ? 'Correct Analysis!' : 'Incorrect Analysis'}</h3>
                <p className="opacity-90">The correct classification is <strong className="uppercase">{activeScenario.correctAnswer}</strong>.</p>
                {isCorrect && !simulationScores[activeScenario.id] && (
                  <p className="text-sm font-bold mt-2 flex items-center justify-center gap-1">
                    <Zap className="w-4 h-4" /> +{activeScenario.xpReward} XP Earned
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h4 className="text-sm font-bold text-cyber-blue uppercase tracking-wider mb-2">Explanation</h4>
                  <p className="text-white/70 leading-relaxed">{activeScenario.explanation}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2">Prevention</h4>
                  <p className="text-white/70 leading-relaxed">{activeScenario.prevention}</p>
                </div>
              </div>

              <button
                onClick={handleBack}
                className="w-full py-4 rounded-xl font-bold bg-cyber-blue text-black hover:bg-cyber-blue/90 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                Return to Simulator
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <button onClick={onClose} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-orange-400" />
            Cyber Attack Simulator
          </h2>
          <p className="text-sm text-white/50 mt-1">Test your skills against real-world threats</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-400">{completedSimulations}<span className="text-sm text-white/30">/{SIMULATION_SCENARIOS.length}</span></div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">Completed</div>
        </div>
      </div>

      <div className="grid gap-4">
        {SIMULATION_SCENARIOS.map((scenario) => {
          const score = simulationScores[scenario.id];
          const isCompleted = score !== undefined;
          const isPassed = score === 100;

          return (
            <button
              key={scenario.id}
              onClick={() => handleStart(scenario)}
              className="bg-cyber-card p-5 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-all text-left flex flex-col gap-4 group relative overflow-hidden"
            >
              {isCompleted && isPassed && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 blur-xl rounded-full translate-x-1/2 -translate-y-1/2" />
              )}
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-orange-400 tracking-wider bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                      {scenario.type}
                    </span>
                    <h3 className="font-bold mt-1 group-hover:text-orange-400 transition-colors">{scenario.title}</h3>
                  </div>
                </div>
                
                {isCompleted ? (
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1",
                    isPassed ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                  )}>
                    {isPassed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {isPassed ? 'Passed' : 'Failed'}
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-white/5 text-white/50 flex items-center gap-1 group-hover:bg-orange-500/10 group-hover:border-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <PlayCircle className="w-3 h-3" /> Start
                  </div>
                )}
              </div>
              
              <p className="text-sm text-white/60 line-clamp-2">{scenario.description}</p>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
