import React, { useState } from 'react';
import { Play, RotateCcw, Trophy, Gauge, Lock, ChevronLeft, Grid } from 'lucide-react';
import { Difficulty, Achievement, GameStats, Theme } from '../types';
import * as LucideIcons from 'lucide-react';
import { playSound } from '../utils/sound';

interface MenuProps {
  onStart: () => void;
  highScore: number;
  title: string;
  subtitle: string;
  lastScore?: number;
  isGameOver?: boolean;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  achievements: Achievement[];
  stats: GameStats;
  theme: Theme;
  isMuted: boolean;
}

export const Menu: React.FC<MenuProps> = ({ 
  onStart, 
  highScore, 
  title, 
  subtitle, 
  lastScore, 
  isGameOver = false,
  difficulty,
  setDifficulty,
  achievements,
  stats,
  theme,
  isMuted,
}) => {
  const [view, setView] = useState<'MAIN' | 'ACHIEVEMENTS'>('MAIN');

  const handleViewChange = (v: 'MAIN' | 'ACHIEVEMENTS') => {
      playSound('ui', isMuted);
      setView(v);
  };

  const handleDifficultyChange = (d: Difficulty) => {
      playSound('ui', isMuted);
      setDifficulty(d);
  };

  // Dynamically render icons
  const renderIcon = (name: string, className?: string) => {
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} size={20} /> : <Trophy className={className} size={20} />;
  };

  const overlayBg = theme === 'dark' ? 'bg-slate-900/95' : 'bg-slate-50/95';
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const cardBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-200';
  const iconBg = theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400';

  if (view === 'ACHIEVEMENTS') {
      const unlockedCount = achievements.filter(a => a.isUnlocked).length;
      const totalCount = achievements.length;

      return (
        <div className={`absolute inset-0 flex flex-col items-center justify-center z-40 overflow-hidden ${overlayBg}`}>
            {/* Background Pattern */}
            <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${theme === 'dark' ? 'bg-[radial-gradient(#ffffff_1px,transparent_1px)]' : 'bg-[radial-gradient(#000000_1px,transparent_1px)]'} [background-size:16px_16px] animate-[pan_20s_linear_infinite]`} />
            <style>{`
                @keyframes pan {
                    0% { background-position: 0 0; }
                    100% { background-position: 32px 32px; }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 1; transform: scale(1); }
                }
                .sparkle {
                    animation: sparkle 1.5s ease-in-out infinite;
                }
            `}</style>

            <div className="relative w-full max-w-lg h-full flex flex-col p-6 z-10">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => handleViewChange('MAIN')} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100 border border-slate-200'}`}>
                        <ChevronLeft className={theme === 'dark' ? 'text-white' : 'text-slate-800'} />
                    </button>
                    <h2 className={`text-2xl font-bold flex items-center gap-2 ${textColor}`}>
                        <Trophy className="text-yellow-500" /> Achievements
                    </h2>
                    <div className={`text-sm font-mono ${subTextColor}`}>{unlockedCount}/{totalCount}</div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className={`${cardBg} p-2 rounded-lg text-center`}>
                        <div className={`text-xs ${subTextColor}`}>Highest Level</div>
                        <div className="font-bold text-purple-500">{stats.highestLevel || 1}</div>
                    </div>
                    <div className={`${cardBg} p-2 rounded-lg text-center`}>
                        <div className={`text-xs ${subTextColor}`}>Boss Kills</div>
                        <div className="font-bold text-red-500">{stats.bossKills}</div>
                    </div>
                    <div className={`${cardBg} p-2 rounded-lg text-center`}>
                        <div className={`text-xs ${subTextColor}`}>Total Score</div>
                        <div className="font-bold text-yellow-500">{stats.totalScore}</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                    {achievements.map(ach => (
                        <div 
                            key={ach.id} 
                            className={`
                                relative p-4 rounded-xl border transition-all duration-300 flex items-center gap-4
                                ${ach.isUnlocked 
                                    ? theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                                    : theme === 'dark' ? 'bg-slate-900/50 border-slate-800 opacity-70' : 'bg-slate-100 border-slate-200 opacity-60'
                                }
                            `}
                        >
                            <div className={`
                                relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden
                                ${ach.isUnlocked ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50' : iconBg}
                            `}>
                                {ach.isUnlocked ? renderIcon(ach.icon) : <Lock size={20} />}
                                {ach.isUnlocked && (
                                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                                        <div className="absolute top-1 left-2 w-1 h-1 bg-white rounded-full sparkle" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="absolute bottom-2 right-3 w-0.5 h-0.5 bg-white rounded-full sparkle" style={{ animationDelay: '0.5s' }}></div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className={`font-bold truncate ${ach.isUnlocked ? textColor : subTextColor}`}>
                                        {ach.title}
                                    </h3>
                                    {ach.isUnlocked && (
                                        <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 text-[10px] font-bold rounded uppercase tracking-wider">
                                            Unlocked
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm leading-tight ${subTextColor}`}>{ach.description}</p>
                                
                                {!ach.isUnlocked && ach.progress && (
                                    <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'}`}>
                                        <div 
                                            className="h-full bg-slate-500 transition-all duration-700 ease-out"
                                            style={{ width: `${ach.progress(stats)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center z-40 backdrop-blur-sm animate-in fade-in duration-300 ${theme === 'dark' ? 'bg-slate-900/90' : 'bg-white/90'}`}>
      <div className="p-8 text-center max-w-md w-full">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 mb-2 drop-shadow-lg tracking-tight">
          {title}
        </h1>
        <p className={`mb-8 text-lg font-light ${subTextColor}`}>{subtitle}</p>

        {isGameOver && (
          <div className="mb-8 animate-bounce">
            <div className={`text-6xl font-bold mb-1 ${textColor}`}>{lastScore}</div>
            <div className="text-sm text-slate-500 uppercase tracking-widest">Score</div>
          </div>
        )}
        
        <div className="mb-6 space-y-2">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
            <Gauge size={14} /> Difficulty
          </div>
          <div className={`flex justify-center gap-2 p-1 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100 border border-slate-200'}`}>
            {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map((diffKey) => {
              const diff = Difficulty[diffKey];
              const isSelected = difficulty === diff;
              let colorClass = "text-slate-400 hover:text-slate-600";
              if (theme === 'dark') colorClass = "text-slate-400 hover:text-white";

              if (isSelected) {
                 if (diff === Difficulty.EASY) colorClass = "bg-green-500/20 text-green-500 shadow-sm";
                 if (diff === Difficulty.MEDIUM) colorClass = "bg-blue-500/20 text-blue-500 shadow-sm";
                 if (diff === Difficulty.HARD) colorClass = "bg-red-500/20 text-red-500 shadow-sm";
              }

              return (
                <button
                  key={diff}
                  onClick={() => handleDifficultyChange(diff)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${colorClass}`}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-lg rounded-full hover:bg-indigo-500 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30 w-full mb-4"
        >
          {isGameOver ? <RotateCcw className="mr-2" /> : <Play className="mr-2" />}
          {isGameOver ? 'Try Again' : 'Start Game'}
        </button>

        <div className="flex gap-2 justify-center">
            <div className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>
                <Trophy size={18} className="text-yellow-500" />
                <span className="font-semibold">Best: {highScore}</span>
            </div>
            <button 
                onClick={() => handleViewChange('ACHIEVEMENTS')}
                className={`flex items-center justify-center py-3 px-4 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
                <Grid size={18} />
            </button>
        </div>
      </div>
      
      {!isGameOver && (
        <div className="absolute bottom-8 text-slate-400/50 text-sm">
           Created with React + Tailwind
        </div>
      )}
    </div>
  );
};
