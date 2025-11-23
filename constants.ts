
import { ColorType, Difficulty, Achievement, GameStats, TargetType } from './types';

export const COLORS = {
  [ColorType.RED]: '#ef4444',    // red-500
  [ColorType.BLUE]: '#3b82f6',   // blue-500
  [ColorType.GREEN]: '#22c55e',  // green-500
  [ColorType.YELLOW]: '#eab308', // yellow-500
};

export const COLOR_KEYS = [ColorType.RED, ColorType.BLUE, ColorType.GREEN, ColorType.YELLOW];

export const TARGET_SCORES = {
  [TargetType.NORMAL]: 10,
  [TargetType.SPLIT]: 20,
  [TargetType.TOUGH]: 30,      // High reward for breaking armor
  [TargetType.STATIONARY]: 15,
  [TargetType.COLOR_SHIFT]: 25,
  [TargetType.SINE_WAVE]: 25,
  [TargetType.BOSS]: 250       // Reduced from 500 to balance progress bar flow
};

export const GAME_CONFIG = {
  TARGET_RADIUS: 32,       // Radius of the floating circles
  BOSS_RADIUS: 60,
  PROJECTILE_RADIUS: 12,   // Radius of the thrown ball
  SHOOTER_RADIUS: 20,      // Radius of the shooter at bottom
  
  SPAWN_INTERVAL_START: 1600, // ms - Slower start for better pacing
  SPAWN_INTERVAL_MIN: 600,    // ms
  
  TARGET_SPEED_BASE: 1.5,
  PROJECTILE_SPEED: 10,    // Slower shots (reduced from 15)
  
  MAX_TARGETS: 12,         // Default, overridden by difficulty
  
  CONTROLS_HEIGHT: 100,    // Reserved height for bottom UI
  
  POINTS_PER_LEVEL: 300,   // Base points needed to trigger a boss
};

export const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]: { speedMultiplier: 0.7, spawnIntervalMultiplier: 1.3, maxTargets: 8, scoreMultiplier: 1, bossHealthMulti: 0.8 },
  [Difficulty.MEDIUM]: { speedMultiplier: 1.0, spawnIntervalMultiplier: 1.0, maxTargets: 12, scoreMultiplier: 1.5, bossHealthMulti: 1.0 },
  [Difficulty.HARD]: { speedMultiplier: 1.5, spawnIntervalMultiplier: 0.7, maxTargets: 16, scoreMultiplier: 2, bossHealthMulti: 1.5 },
};

export const INITIAL_STATS: GameStats = {
  totalScore: 0,
  highScore: 0,
  gamesPlayed: 0,
  shotsFired: 0,
  targetsHit: 0,
  targetsMissed: 0,
  highestStreak: 0,
  toughKills: 0,
  splitKills: 0,
  stationaryKills: 0,
  colorShiftKills: 0,
  sineWaveKills: 0,
  bossKills: 0,
  highestLevel: 1,
  hardModeGames: 0
};

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'isUnlocked'>[] = [
  // --- SCORE ---
  {
    id: 'score_novice',
    title: 'Color Cadet',
    description: 'Score 1,000 total points across all games.',
    icon: 'Star',
    category: 'SCORE',
    condition: (s) => s.totalScore >= 1000,
    progress: (s) => Math.min(100, (s.totalScore / 1000) * 100)
  },
  {
    id: 'score_pro',
    title: 'Spectrum Striker',
    description: 'Score 10,000 total points.',
    icon: 'Award',
    category: 'SCORE',
    condition: (s) => s.totalScore >= 10000,
    progress: (s) => Math.min(100, (s.totalScore / 10000) * 100)
  },
  {
    id: 'score_master',
    title: 'Prism Paragon',
    description: 'Score 50,000 total points.',
    icon: 'Crown',
    category: 'SCORE',
    condition: (s) => s.totalScore >= 50000,
    progress: (s) => Math.min(100, (s.totalScore / 50000) * 100)
  },
  {
    id: 'high_score_200',
    title: 'Supernova',
    description: 'Get a high score of 200 in a single game.',
    icon: 'Sun',
    category: 'SCORE',
    condition: (s) => s.highScore >= 200,
    progress: (s) => Math.min(100, (s.highScore / 200) * 100)
  },

  // --- MASTERY ---
  {
    id: 'streak_25',
    title: 'Unstoppable',
    description: 'Reach a streak of 25 hits in one game.',
    icon: 'Zap',
    category: 'MASTERY',
    condition: (s) => s.highestStreak >= 25,
    progress: (s) => Math.min(100, (s.highestStreak / 25) * 100)
  },
  {
    id: 'hits_1000',
    title: 'Grand Artist',
    description: 'Hit 1,000 targets total.',
    icon: 'Palette',
    category: 'MASTERY',
    condition: (s) => s.targetsHit >= 1000,
    progress: (s) => Math.min(100, (s.targetsHit / 1000) * 100)
  },

  // --- COMBAT (Specific Targets) ---
  {
    id: 'kill_tough_50',
    title: 'Armor Piercing',
    description: 'Destroy 50 Tough targets.',
    icon: 'ShieldX',
    category: 'COMBAT',
    condition: (s) => s.toughKills >= 50,
    progress: (s) => Math.min(100, (s.toughKills / 50) * 100)
  },
  {
    id: 'kill_boss_1',
    title: 'Giant Slayer',
    description: 'Defeat your first Boss.',
    icon: 'Swords',
    category: 'COMBAT',
    condition: (s) => s.bossKills >= 1,
    progress: (s) => Math.min(100, (s.bossKills / 1) * 100)
  },
  {
    id: 'kill_boss_10',
    title: 'Boss Hunter',
    description: 'Defeat 10 Bosses.',
    icon: 'Skull',
    category: 'COMBAT',
    condition: (s) => s.bossKills >= 10,
    progress: (s) => Math.min(100, (s.bossKills / 10) * 100)
  },
  {
    id: 'kill_boss_50',
    title: 'Titan Toppler',
    description: 'Defeat 50 Bosses.',
    icon: 'Skull',
    category: 'COMBAT',
    condition: (s) => s.bossKills >= 50,
    progress: (s) => Math.min(100, (s.bossKills / 50) * 100)
  },
  {
    id: 'level_5',
    title: 'Level Up!',
    description: 'Reach Level 5 in a single game.',
    icon: 'ChevronsUp',
    category: 'COMBAT',
    condition: (s) => s.highestLevel >= 5,
    progress: (s) => Math.min(100, (s.highestLevel / 5) * 100)
  },
  {
    id: 'level_10',
    title: 'Ascension',
    description: 'Reach Level 10 in a single game.',
    icon: 'ChevronsUp',
    category: 'COMBAT',
    condition: (s) => s.highestLevel >= 10,
    progress: (s) => Math.min(100, (s.highestLevel / 10) * 100)
  },

  // --- DEDICATION ---
  {
    id: 'games_50',
    title: 'Addict',
    description: 'Play 50 games.',
    icon: 'Coffee',
    category: 'DEDICATION',
    condition: (s) => s.gamesPlayed >= 50,
    progress: (s) => Math.min(100, (s.gamesPlayed / 50) * 100)
  },
  {
    id: 'hard_mode_10',
    title: 'Hardcore Hero',
    description: 'Play 10 games on Hard difficulty.',
    icon: 'Flame',
    category: 'DEDICATION',
    condition: (s) => s.hardModeGames >= 10,
    progress: (s) => Math.min(100, (s.hardModeGames / 10) * 100)
  }
];
