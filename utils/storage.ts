
import { GameStats, Achievement, GameSettings, Difficulty, Theme } from '../types';
import { INITIAL_STATS } from '../constants';

const KEYS = {
  STATS: 'chroma_shot_stats',
  ACHIEVEMENTS: 'chroma_shot_unlocked',
  SETTINGS: 'chroma_shot_settings'
};

// Helper to safely parse JSON
const safeParse = <T>(data: string | null, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.warn('Failed to parse game data, using fallback', e);
    return fallback;
  }
};

// --- Stats ---
export const saveStats = (stats: GameStats) => {
  try {
    localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
};

export const loadStats = (): GameStats => {
  const data = localStorage.getItem(KEYS.STATS);
  // Merge with INITIAL_STATS to ensure new stat fields are added to old save files
  const parsed = safeParse(data, INITIAL_STATS);
  return { ...INITIAL_STATS, ...parsed };
};

// --- Achievements ---
export const saveUnlockedAchievements = (unlockedIds: string[]) => {
  try {
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(unlockedIds));
  } catch (e) {
    console.error('Failed to save achievements', e);
  }
};

export const loadUnlockedAchievements = (): string[] => {
  return safeParse(localStorage.getItem(KEYS.ACHIEVEMENTS), []);
};

// --- Settings (Theme, Mute, Difficulty, Tutorial) ---
const DEFAULT_SETTINGS: GameSettings = {
  isMuted: false,
  theme: 'dark',
  difficulty: Difficulty.MEDIUM,
  hasPlayedTutorial: false
};

export const saveSettings = (settings: GameSettings) => {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
};

export const loadSettings = (): GameSettings => {
  const data = localStorage.getItem(KEYS.SETTINGS);
  const parsed = safeParse(data, DEFAULT_SETTINGS);
  
  // Legacy support: check individual keys if main settings object doesn't exist
  if (!data) {
    const legacyTheme = localStorage.getItem('chroma_shot_theme') as Theme;
    const legacyTutorial = localStorage.getItem('chroma_shot_has_played');
    
    return {
      ...DEFAULT_SETTINGS,
      theme: legacyTheme || 'dark',
      hasPlayedTutorial: legacyTutorial === 'true'
    };
  }

  return { ...DEFAULT_SETTINGS, ...parsed };
};
