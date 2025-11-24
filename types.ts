

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum ColorType {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW'
}

export enum TargetType {
  NORMAL = 'NORMAL',
  SPLIT = 'SPLIT',
  TOUGH = 'TOUGH',
  STATIONARY = 'STATIONARY',
  COLOR_SHIFT = 'COLOR_SHIFT',
  SINE_WAVE = 'SINE_WAVE',
  BOSS = 'BOSS'
}

export enum TargetShape {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  TRIANGLE = 'TRIANGLE',
  DIAMOND = 'DIAMOND',
  STAR = 'STAR' // Reserved for Boss
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export type Theme = 'light' | 'dark';

export interface GameSettings {
  isMuted: boolean;
  theme: Theme;
  difficulty: Difficulty;
  hasPlayedTutorial: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: ColorType;
  radius: number;
  active: boolean;
}

export interface Target {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: ColorType;
  radius: number;
  rotation: number;      // Current rotation in degrees
  rotationSpeed: number; // Degrees per frame
  type: TargetType;
  shape: TargetShape;
  health: number;
  maxHealth?: number;
  colorShiftTimer?: number;
  
  // Sine Wave specific
  initialY?: number;
  timeOffset?: number;
  
  // Boss specific
  summonTimer?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string; // Hex code
  size: number;
  type?: 'BURST' | 'DEBRIS' | 'TRAIL' | 'RING' | 'SPARK';
  active: boolean;
  rotation?: number;
}

export interface GameDimensions {
  width: number;
  height: number;
}

// Achievement System Types

export interface GameStats {
  totalScore: number;
  highScore: number;
  gamesPlayed: number;
  shotsFired: number;
  targetsHit: number;
  targetsMissed: number;
  highestStreak: number;
  
  // Specific Target Kills
  toughKills: number;
  splitKills: number;
  stationaryKills: number;
  colorShiftKills: number;
  sineWaveKills: number;
  bossKills: number;

  // Progression
  highestLevel: number;
  hardModeGames: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Name of the lucide icon
  condition: (stats: GameStats) => boolean;
  isUnlocked: boolean;
  progress?: (stats: GameStats) => number; // 0 to 100 for progress bar
  category: 'SCORE' | 'COMBAT' | 'MASTERY' | 'DEDICATION';
}

// Telegram Web App Types
export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  colorScheme: 'light' | 'dark';
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  platform: string;
  version: string;
  isVersionAtLeast: (version: string) => boolean;
  
  BackButton: {
      isVisible: boolean;
      onClick: (callback: () => void) => void;
      offClick: (callback: () => void) => void;
      show: () => void;
      hide: () => void;
  };

  MainButton: {
      isVisible: boolean;
      text: string;
      color: string;
      textColor: string;
      show: () => void;
      hide: () => void;
      enable: () => void;
      disable: () => void;
      onClick: (callback: () => void) => void;
      offClick: (callback: () => void) => void;
      showProgress: (leaveActive: boolean) => void;
      hideProgress: () => void;
  };

  HapticFeedback: {
      impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
      notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
      selectionChanged: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}