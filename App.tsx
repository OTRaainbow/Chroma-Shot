

import React, { useState, useEffect, useCallback } from 'react';
import { Game } from './components/Game';
import { Menu } from './components/Menu';
import { GameState, Difficulty, GameStats, Achievement, Theme } from './types';
import { INITIAL_STATS, ACHIEVEMENT_DEFINITIONS } from './constants';
import { Volume2, VolumeX, Trophy, Sun, Moon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { loadStats, loadUnlockedAchievements, loadSettings, saveStats, saveUnlockedAchievements, saveSettings } from './utils/storage';
import { initAudio, playSound, playMusic, stopMusic } from './utils/sound';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  
  // Settings State
  const [isMuted, setIsMuted] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Loading State to prevent overwriting settings on mount
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Achievement System State
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [toast, setToast] = useState<{title: string, icon: string} | null>(null);

  // 1. Load Data on Mount & Initialize Telegram
  useEffect(() => {
    // Check for Telegram Environment
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Auto-sync theme with Telegram settings
      if (tg.colorScheme) {
          setTheme(tg.colorScheme);
      }
    }

    // Load Settings
    const savedSettings = loadSettings();
    setIsMuted(savedSettings.isMuted);
    
    // Only use saved theme if NOT in Telegram, or if we want persistence to override TG (here we prefer TG sync if available)
    if (!tg) {
        setTheme(savedSettings.theme);
    }

    setDifficulty(savedSettings.difficulty);
    setShowTutorial(!savedSettings.hasPlayedTutorial);
    
    // Mark settings as loaded so we can safely auto-save later
    setIsSettingsLoaded(true);

    // Load Stats
    const currentStats = loadStats();
    setStats(currentStats);

    // Load Achievements
    const unlockedIds = loadUnlockedAchievements();
    
    // Hydrate achievements with unlocked status
    const hydratedAchievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      isUnlocked: unlockedIds.includes(def.id)
    }));
    setAchievements(hydratedAchievements);
  }, []);

  // Handle Telegram Back Button
  useEffect(() => {
      const tg = window.Telegram?.WebApp;
      if (!tg) return;

      // Check support for BackButton (added in v6.1)
      if (!tg.isVersionAtLeast || !tg.isVersionAtLeast('6.1')) return;

      const handleBack = () => {
          if (gameState === GameState.PLAYING) {
              setGameState(GameState.MENU);
          } else if (gameState === GameState.GAME_OVER) {
              setGameState(GameState.MENU);
          }
      };

      if (gameState !== GameState.MENU) {
          tg.BackButton.show();
          tg.BackButton.onClick(handleBack);
      } else {
          tg.BackButton.hide();
      }

      return () => {
          tg.BackButton.offClick(handleBack);
      };
  }, [gameState]);

  // 2. Auto-Save Settings when they change (Only after initial load)
  useEffect(() => {
    if (!isSettingsLoaded) return;

    saveSettings({
      isMuted,
      theme,
      difficulty,
      hasPlayedTutorial: !showTutorial
    });
  }, [isMuted, theme, difficulty, showTutorial, isSettingsLoaded]);

  // 3. Manage Music based on State
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        stopMusic();
    } else {
        // Menu or Game Over - Play Music
        playMusic(isMuted);
    }
  }, [gameState, isMuted]);

  const toggleTheme = () => {
      initAudio();
      playSound('ui', isMuted);
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleMute = () => {
      initAudio(); 
      playSound('ui', isMuted);
      setIsMuted(!isMuted);
      if (!isMuted) stopMusic(); // If muting, stop immediately
      else if (gameState !== GameState.PLAYING) playMusic(false); // If unmuting in menu, start
  };

  const handleGameOver = (finalScore: number, sessionStats: GameStats) => {
    setScore(finalScore);
    
    // Merge Stats
    const newStats: GameStats = {
        totalScore: stats.totalScore + sessionStats.totalScore,
        highScore: Math.max(stats.highScore, finalScore),
        gamesPlayed: stats.gamesPlayed + 1,
        shotsFired: stats.shotsFired + sessionStats.shotsFired,
        targetsHit: stats.targetsHit + sessionStats.targetsHit,
        targetsMissed: stats.targetsMissed + sessionStats.targetsMissed,
        highestStreak: Math.max(stats.highestStreak, sessionStats.highestStreak),
        toughKills: stats.toughKills + sessionStats.toughKills,
        splitKills: stats.splitKills + sessionStats.splitKills,
        stationaryKills: stats.stationaryKills + sessionStats.stationaryKills,
        colorShiftKills: stats.colorShiftKills + sessionStats.colorShiftKills,
        sineWaveKills: stats.sineWaveKills + sessionStats.sineWaveKills,
        bossKills: stats.bossKills + sessionStats.bossKills,
        highestLevel: Math.max(stats.highestLevel, sessionStats.highestLevel),
        hardModeGames: stats.hardModeGames + sessionStats.hardModeGames
    };
    
    setStats(newStats);
    saveStats(newStats); // Save to storage

    // Check Achievements
    const newUnlockedIds: string[] = [];
    const updatedAchievements = achievements.map(ach => {
        if (ach.isUnlocked) return ach;
        
        if (ach.condition(newStats)) {
            newUnlockedIds.push(ach.id);
            return { ...ach, isUnlocked: true };
        }
        return ach;
    });

    if (newUnlockedIds.length > 0) {
        setAchievements(updatedAchievements);
        
        // Extract all IDs to save
        const allUnlockedIds = updatedAchievements.filter(a => a.isUnlocked).map(a => a.id);
        saveUnlockedAchievements(allUnlockedIds);

        // Trigger Toast & Sound
        const lastUnlocked = updatedAchievements.find(a => a.id === newUnlockedIds[0]);
        if (lastUnlocked) {
             setToast({ title: lastUnlocked.title, icon: lastUnlocked.icon });
             playSound('achievement', isMuted); // Play achievement sound
             setTimeout(() => setToast(null), 3000);
        }
    }

    setGameState(GameState.GAME_OVER);
  };

  const handleSendScoreToTelegram = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        // Prepare payload for bot
        const data = JSON.stringify({
            score: score,
            difficulty: difficulty,
            highScore: stats.highScore
        });
        tg.sendData(data);
    }
  }, [score, difficulty, stats.highScore]);

  const startGame = () => {
    initAudio();
    playSound('ui', isMuted);
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const bgClass = theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';
  const buttonClass = theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300 text-slate-700';

  const renderToast = () => {
    if (!toast) return null;
    const IconComponent = (LucideIcons as any)[toast.icon] || Trophy;
    
    return (
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-300">
          <div className={`backdrop-blur-md border px-6 py-3 rounded-full shadow-xl flex items-center gap-3 ${theme === 'dark' ? 'bg-slate-800/90 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-white/90 border-yellow-500/50 shadow-lg'}`}>
              <div className="bg-yellow-500/20 p-2 rounded-full">
                <IconComponent size={20} className="text-yellow-600" />
              </div>
              <div>
                  <div className="text-yellow-600 text-xs font-bold uppercase tracking-widest">Achievement Unlocked</div>
                  <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{toast.title}</div>
              </div>
          </div>
      </div>
    );
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden font-sans select-none transition-colors duration-500 ${bgClass}`}>
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
            className={`p-2 rounded-full transition-colors ${buttonClass}`}
          >
            {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            className={`p-2 rounded-full transition-colors ${buttonClass}`}
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
      </div>
      
      {/* Achievement Toast */}
      {renderToast()}

      {gameState === GameState.MENU && (
        <Menu 
          onStart={startGame} 
          highScore={stats.highScore} 
          title="Chroma Shot"
          subtitle="Tap to shoot the ball into the matching colored ring!"
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          achievements={achievements}
          stats={stats}
          theme={theme}
          isMuted={isMuted}
        />
      )}

      {gameState === GameState.PLAYING && (
        <Game 
          onGameOver={handleGameOver} 
          isMuted={isMuted}
          difficulty={difficulty}
          initialTutorial={showTutorial}
          onTutorialComplete={() => setShowTutorial(false)}
          theme={theme}
        />
      )}

      {gameState === GameState.GAME_OVER && (
        <Menu 
          onStart={startGame} 
          highScore={stats.highScore}
          lastScore={score}
          title="Game Over"
          subtitle="Oops! You hit the wrong color."
          isGameOver
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          achievements={achievements}
          stats={stats}
          theme={theme}
          isMuted={isMuted}
          onSendScore={handleSendScoreToTelegram}
        />
      )}
    </div>
  );
};

export default App;