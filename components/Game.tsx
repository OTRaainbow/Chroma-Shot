
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ColorType, Projectile, Target, Particle, GameDimensions, TargetType, Difficulty, GameStats, Theme, TargetShape } from '../types';
import { COLORS, COLOR_KEYS, GAME_CONFIG, DIFFICULTY_SETTINGS, TARGET_SCORES } from '../constants';
import { playSound } from '../utils/sound';
import { Target as TargetIcon, Feather, Zap, Flame, Hand, Crown, Skull, Crosshair } from 'lucide-react';

interface GameProps {
  onGameOver: (score: number, sessionStats: GameStats) => void;
  isMuted: boolean;
  difficulty: Difficulty;
  initialTutorial: boolean;
  onTutorialComplete: () => void;
  theme: Theme;
}

export const Game: React.FC<GameProps> = ({ onGameOver, isMuted, difficulty, initialTutorial, onTutorialComplete, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const poolsInitializedRef = useRef(false);
  
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];

  // Initialize spawn timer so first target spawns immediately
  const spawnTimerRef = useRef<number>(GAME_CONFIG.SPAWN_INTERVAL_START * diffSettings.spawnIntervalMultiplier + 100);
  const lastShotTimeRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);

  // Use a ref for dimensions to access them in the loop without dependency issues
  const dimensionsRef = useRef<GameDimensions>({ width: 0, height: 0 });

  // Game State
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0); // 0 to 100
  const [isBossFight, setIsBossFight] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ColorType>(ColorType.RED);
  const [shooterPulse, setShooterPulse] = useState(false);
  
  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState(initialTutorial ? 1 : 0);
  
  // Entities State for rendering
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [activeParticles, setActiveParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  
  // Session Stats Ref
  const sessionStatsRef = useRef<GameStats>({
    totalScore: 0,
    highScore: 0, 
    gamesPlayed: 1,
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
    hardModeGames: difficulty === Difficulty.HARD ? 1 : 0
  });

  // Logic Refs
  const gameStateRef = useRef({
    projectilePool: [] as Projectile[], 
    particlePool: [] as Particle[], // Pooled particles
    particleCursor: 0, // Cursor for ring buffer allocation
    targets: [] as Target[],
    currentColor: ColorType.RED,
    score: 0,
    level: 1,
    scoreSinceLastBoss: 0,
    bossActive: false,
    streak: 0,
    speedMultiplier: 1,
    baseSpawnInterval: GAME_CONFIG.SPAWN_INTERVAL_START * diffSettings.spawnIntervalMultiplier,
    nextSpawnDelay: 0, 
    isGameOver: false,
    isEnding: false,
    shakeTimer: 0,
    time: 0,
    lastScoreMilestone: 0
  });

  // Initialize Pooling
  useEffect(() => {
    if (poolsInitializedRef.current) return;
    
    // Projectiles
    for (let i = 0; i < 50; i++) {
      gameStateRef.current.projectilePool.push({
        id: `pool-${i}`,
        x: 0, y: 0, vx: 0, vy: 0,
        color: ColorType.RED,
        radius: GAME_CONFIG.PROJECTILE_RADIUS,
        active: false
      });
    }
    // Particles (Fixed Max Pool for Performance - Ring Buffer)
    for (let i = 0; i < 600; i++) {
      gameStateRef.current.particlePool.push({
        id: `p-pool-${i}`,
        x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff', size: 0, 
        active: false, type: 'BURST'
      });
    }
    poolsInitializedRef.current = true;
  }, []);

  // Initialize ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        dimensionsRef.current = { width: clientWidth, height: clientHeight };
      }
    };
    
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const handleColorSelect = useCallback((color: ColorType) => {
    setSelectedColor(color);
    gameStateRef.current.currentColor = color;
    playSound('rotate', isMuted);
    if (tutorialStep === 1) {
        setTutorialStep(2);
        // Spawn a dummy target so the user has something to aim at in Step 2
        gameStateRef.current.targets.push({
            id: 'tutorial-target',
            x: dimensionsRef.current.width / 2,
            y: dimensionsRef.current.height / 3,
            vx: 0, vy: 0,
            color: color,
            radius: GAME_CONFIG.TARGET_RADIUS,
            rotation: 0, rotationSpeed: 1.5,
            type: TargetType.STATIONARY,
            shape: TargetShape.CIRCLE,
            health: 1
        });
    }
  }, [isMuted, tutorialStep]);

  // Handle Mouse Scroll for Color Switching
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        const now = Date.now();
        if (now - lastScrollTimeRef.current < 50) return; // Throttle
        lastScrollTimeRef.current = now;

        const currentIndex = COLOR_KEYS.indexOf(selectedColor);
        // Standard: scroll down (positive deltaY) -> next item.
        const direction = e.deltaY > 0 ? 1 : -1;
        
        let nextIndex = currentIndex + direction;
        if (nextIndex >= COLOR_KEYS.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = COLOR_KEYS.length - 1;
        
        handleColorSelect(COLOR_KEYS[nextIndex]);
    };

    // Passive true allows default scrolling, false would let us preventDefault but blocking scroll is aggressive.
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [selectedColor, handleColorSelect]);

  // Optimized Particle Spawner using Ring Buffer (O(1))
  const spawnParticle = useCallback((config: Partial<Particle>) => {
    const state = gameStateRef.current;
    if (state.particlePool.length === 0) return;

    const idx = state.particleCursor;
    const p = state.particlePool[idx];
    
    // Increment cursor for next spawn
    state.particleCursor = (idx + 1) % state.particlePool.length;
    
    // Reset and Assign new config
    if (p) {
        Object.assign(p, config);
        p.active = true;
        // Ensure rotation is reset if not provided
        if (config.rotation === undefined) p.rotation = 0; 
    }
  }, []);

  const getAimAssistVector = (
    startX: number, 
    startY: number, 
    baseVx: number, 
    baseVy: number,
    targets: Target[]
  ): { vx: number, vy: number, assisted: boolean } => {
    const ASSIST_CONE_ANGLE = 15 * (Math.PI / 180);
    const ASSIST_STRENGTH = 0.3;

    let bestTarget: Target | null = null;
    let minAngleDiff = Infinity;
    let perfectVx = 0;
    let perfectVy = 0;

    const baseAngle = Math.atan2(baseVy, baseVx);
    const speed = Math.sqrt(baseVx*baseVx + baseVy*baseVy);

    if (speed < 0.1) return { vx: baseVx, vy: baseVy, assisted: false };

    for (const t of targets) {
      // Only assist towards matching colors
      if (t.color !== gameStateRef.current.currentColor) continue;

      const dx = t.x - startX;
      const dy = t.y - startY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist <= 0.1) continue; // Prevent division by zero

      const angleToTarget = Math.atan2(dy, dx);
      
      let angleDiff = Math.abs(angleToTarget - baseAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff < ASSIST_CONE_ANGLE && angleDiff < minAngleDiff) {
        minAngleDiff = angleDiff;
        bestTarget = t;
        perfectVx = (dx / dist) * speed;
        perfectVy = (dy / dist) * speed;
      }
    }

    if (bestTarget) {
      const newVx = baseVx + (perfectVx - baseVx) * ASSIST_STRENGTH;
      const newVy = baseVy + (perfectVy - baseVy) * ASSIST_STRENGTH;
      const newSpeed = Math.sqrt(newVx*newVx + newVy*newVy);
      
      if (newSpeed > 0) {
          return {
            vx: (newVx / newSpeed) * speed,
            vy: (newVy / newSpeed) * speed,
            assisted: true
          };
      }
    }

    return { vx: baseVx, vy: baseVy, assisted: false };
  };

  const shoot = useCallback((targetX: number, targetY: number) => {
    if (tutorialStep === 1) return;
    
    const now = Date.now();
    if (now - lastShotTimeRef.current < 150) return;

    if (gameStateRef.current.isGameOver || gameStateRef.current.isEnding) return;
    const { width, height } = dimensionsRef.current;
    if (width === 0 || height === 0) return;
    if (targetY > height - GAME_CONFIG.CONTROLS_HEIGHT) return;

    const shooterX = width / 2;
    const shooterY = height - GAME_CONFIG.CONTROLS_HEIGHT - 20;

    setShooterPulse(true);
    setTimeout(() => setShooterPulse(false), 150);

    const dx = targetX - shooterX;
    const dy = targetY - shooterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1) return; 

    const speed = GAME_CONFIG.PROJECTILE_SPEED;
    const rawVx = (dx / distance) * speed;
    const rawVy = (dy / distance) * speed;

    const { vx, vy } = getAimAssistVector(
        shooterX, shooterY, rawVx, rawVy, gameStateRef.current.targets
    );

    if (isNaN(vx) || isNaN(vy)) return; // Safety check

    const pool = gameStateRef.current.projectilePool;
    let projectile = pool.find(p => !p.active);

    if (!projectile) {
      projectile = {
        id: `pool-extra-${Date.now()}`,
        x: 0, y: 0, vx: 0, vy: 0,
        color: ColorType.RED,
        radius: GAME_CONFIG.PROJECTILE_RADIUS,
        active: false
      };
      pool.push(projectile);
    }

    projectile.x = shooterX;
    projectile.y = shooterY;
    projectile.vx = vx;
    projectile.vy = vy;
    projectile.color = gameStateRef.current.currentColor;
    projectile.active = true;
    projectile.id = `shot-${now}-${Math.random()}`;
    
    sessionStatsRef.current.shotsFired++;

    // Muzzle Flash
    for(let i=0; i<3; i++) {
        spawnParticle({
            x: shooterX,
            y: shooterY - GAME_CONFIG.SHOOTER_RADIUS,
            vx: (Math.random() - 0.5) * 3,
            vy: -1 - Math.random() * 2,
            life: 0.2 + Math.random() * 0.1,
            color: theme === 'dark' ? '#ffffff' : '#334155',
            size: 8 + Math.random() * 8,
            type: 'BURST'
        });
    }

    lastShotTimeRef.current = now;
    
    // Change: Use 'shoot' sound instead of 'score'
    playSound('shoot', isMuted); 

    if (tutorialStep === 2) {
        setTutorialStep(0);
        onTutorialComplete();
    }

  }, [isMuted, tutorialStep, onTutorialComplete, theme, spawnParticle]);

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            if (dimensionsRef.current.height && touch.clientY > dimensionsRef.current.height - GAME_CONFIG.CONTROLS_HEIGHT) return;
            if (e.cancelable) e.preventDefault();
            shoot(touch.clientX, touch.clientY);
        }
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (dimensionsRef.current.height && e.clientY > dimensionsRef.current.height - GAME_CONFIG.CONTROLS_HEIGHT) return;
        shoot(e.clientX, e.clientY);
    };

    const container = containerRef.current;
    if(container) {
        container.addEventListener('touchstart', handleTouch, { passive: false });
        container.addEventListener('mousedown', handleMouseDown);
    }
    return () => {
        if(container) {
            container.removeEventListener('touchstart', handleTouch);
            container.removeEventListener('mousedown', handleMouseDown);
        }
    };
  }, [shoot]);

  // Enhanced Particle Spawner
  const spawnHitParticles = useCallback((x: number, y: number, color: string, type: TargetType | 'MISS', accuracy: number = 0.5) => {
    let count = 12 + Math.floor(accuracy * 15); // More accuracy = more particles
    let speedBase = 4 + accuracy * 3;
    let sizeBase = 5;

    // Visual Configurations based on Type
    if (type === 'MISS') {
        count = 20;
        speedBase = 5;
        color = theme === 'dark' ? '#94a3b8' : '#475569';
        
        // Debris for miss
        for(let i=0; i<8; i++) {
            spawnParticle({
                x, y, 
                vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 5, 
                life: 0.8 + Math.random() * 0.5, color, size: 4 + Math.random() * 4, type: 'DEBRIS'
            });
        }
    } else if (type === TargetType.BOSS) {
        count = 80; // Huge explosion
        speedBase = 15;
        sizeBase = 10;
        spawnParticle({ x, y, vx: 0, vy: 0, life: 1.2, color, size: 250, type: 'RING', active: true });
        spawnParticle({ x, y, vx: 0, vy: 0, life: 1.0, color: '#fff', size: 180, type: 'RING', active: true });
    } else if (type === TargetType.TOUGH) {
        count = 25;
        speedBase = 9;
        // Sparks for armor hit
        for(let i=0; i<10; i++) {
             spawnParticle({
                x, y, 
                vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, 
                life: 0.3, color: '#ffff00', size: 3, type: 'SPARK'
            });
        }
    } else if (type === TargetType.SPLIT) {
        count = 30;
        spawnParticle({ x, y, vx: 0, vy: 0, life: 0.8, color, size: GAME_CONFIG.TARGET_RADIUS * 2.5, type: 'RING', active: true });
    }

    // General Burst
    for(let p=0; p<count; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * speedBase + (speedBase * 0.2);
        const pColor = Math.random() > 0.8 ? '#ffffff' : color;
        
        spawnParticle({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.4 + Math.random() * 0.4,
            color: pColor,
            size: Math.random() * sizeBase + 2,
            type: 'BURST'
        });
    }
    
    // High Accuracy Sparks
    if (accuracy > 0.8 && type !== 'MISS') {
         for(let i=0; i<8; i++) {
            spawnParticle({
                x, y, 
                vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, 
                life: 0.25, color: '#ffffff', size: 2, type: 'SPARK'
            });
        }
    }

  }, [spawnParticle, theme]);

  // Main Game Loop
  const animate = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const timeFactor = Math.min(deltaTime / 16.667, 4);
    const state = gameStateRef.current;
    
    if (state.isGameOver && !state.isEnding) return;

    // 1. Update Particles (Efficient Iteration)
    const activeParticlesList: Particle[] = [];
    for(const p of state.particlePool) {
         if (!p.active) continue;

         if (p.type === 'TRAIL') {
             p.size *= 0.75; 
             p.life -= 0.1 * timeFactor; 
         } else if (p.type === 'DEBRIS') {
             p.vy += 0.4 * timeFactor; // Gravity
             p.x += p.vx * timeFactor;
             p.y += p.vy * timeFactor;
             p.life -= 0.015 * timeFactor;
             p.rotation = (p.rotation || 0) + 5;
         } else if (p.type === 'RING') {
             p.size += 15 * timeFactor; 
             p.life -= 0.05 * timeFactor;
         } else if (p.type === 'SPARK') {
             p.x += p.vx * timeFactor;
             p.y += p.vy * timeFactor;
             p.life -= 0.05 * timeFactor; 
         } else {
             p.vx *= 0.92; p.vy *= 0.92; // Friction
             p.x += p.vx * timeFactor;
             p.y += p.vy * timeFactor;
             p.life -= 0.03 * timeFactor;
             p.size *= 0.95;
         }
        
        if(p.life <= 0.01 || p.size < 0.5 || isNaN(p.x) || isNaN(p.y)) {
            p.active = false;
        } else {
            activeParticlesList.push(p);
        }
    }

    if (state.isEnding) {
        if (state.shakeTimer > 0) {
            state.shakeTimer -= deltaTime;
            if (state.shakeTimer <= 0) setShake(false);
        }
        setActiveParticles(activeParticlesList);
        requestRef.current = requestAnimationFrame(animate);
        return;
    }

    const isTutorial = tutorialStep > 0;
    if (!isTutorial) state.time += deltaTime;
    
    const { width, height } = dimensionsRef.current;
    if (width === 0 || height === 0) {
        requestRef.current = requestAnimationFrame(animate);
        return;
    }

    if (state.shakeTimer > 0) {
        state.shakeTimer -= deltaTime;
        if (state.shakeTimer <= 0) setShake(false);
    }

    const playableHeight = height - GAME_CONFIG.CONTROLS_HEIGHT;

    // 2. Spawning Logic
    if (!isTutorial) {
        const pointsForNextLevel = GAME_CONFIG.POINTS_PER_LEVEL + (state.level * 100);

        // Boss Trigger
        if (!state.bossActive && state.scoreSinceLastBoss > pointsForNextLevel) {
            state.bossActive = true;
            state.scoreSinceLastBoss = 0;
            playSound('whir', isMuted);
            
            // Clear some targets to make arena space
            state.targets = state.targets.filter(t => Math.random() > 0.6);

            const bossColor = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
            state.targets.push({
                id: `boss-${Date.now()}`,
                x: width / 2,
                y: -120, // Enter from top
                vx: (Math.random() - 0.5) * 2,
                vy: 3, 
                color: bossColor,
                radius: GAME_CONFIG.BOSS_RADIUS,
                rotation: 0, rotationSpeed: 1,
                type: TargetType.BOSS,
                shape: TargetShape.STAR,
                health: 10 + (state.level * 5 * diffSettings.bossHealthMulti),
                maxHealth: 10 + (state.level * 5 * diffSettings.bossHealthMulti),
                colorShiftTimer: 0,
                summonTimer: 4000 
            });
            setIsBossFight(true);
        }

        spawnTimerRef.current += deltaTime;
        const effectiveSpawnDelay = state.bossActive ? state.nextSpawnDelay * 4 : state.nextSpawnDelay;

        if (spawnTimerRef.current > effectiveSpawnDelay) {
            spawnTimerRef.current = 0;
            const intervalRandomness = 0.6 + Math.random() * 0.8; 
            state.nextSpawnDelay = state.baseSpawnInterval * intervalRandomness;
            
            const calculatedMax = Math.floor(diffSettings.maxTargets * (1 + (state.speedMultiplier - 1) * 0.5));
            const currentMaxTargets = Math.min(calculatedMax, 24);

            if (state.targets.length < currentMaxTargets && (!state.bossActive || state.targets.length < 3)) {
                const radius = GAME_CONFIG.TARGET_RADIUS;
                const randomColor = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
                
                let startX = Math.random() * (width - radius * 2) + radius;
                let startY = Math.random() * (playableHeight * 0.6) + radius; 
                
                // Avoid overlap on spawn
                let validPosition = true;
                for(const t of state.targets) {
                    if (Math.hypot(t.x - startX, t.y - startY) < radius * 2 + 40) { 
                        validPosition = false; break;
                    }
                }
                
                if (validPosition) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = GAME_CONFIG.TARGET_SPEED_BASE * state.speedMultiplier * diffSettings.speedMultiplier;

                    let targetType = TargetType.NORMAL;
                    let targetShape = TargetShape.CIRCLE;
                    let targetHealth = 1;
                    
                    const availableShapes = [TargetShape.CIRCLE];
                    if (state.level >= 2) availableShapes.push(TargetShape.SQUARE);
                    if (state.level >= 3) availableShapes.push(TargetShape.TRIANGLE);
                    if (state.level >= 4) availableShapes.push(TargetShape.DIAMOND);
                    
                    targetShape = availableShapes[Math.floor(Math.random() * availableShapes.length)];

                    const roll = Math.random();
                    const specialChance = difficulty === Difficulty.EASY ? 0.15 : difficulty === Difficulty.MEDIUM ? 0.35 : 0.6;
                    
                    if (state.score >= 15 || difficulty !== Difficulty.EASY) {
                        if (roll < specialChance) {
                            const typeRoll = Math.random();
                            if (typeRoll < 0.25) targetType = TargetType.TOUGH;
                            else if (typeRoll < 0.45) targetType = TargetType.SPLIT;
                            else if (typeRoll < 0.65) targetType = TargetType.STATIONARY;
                            else if (typeRoll < 0.85) targetType = TargetType.COLOR_SHIFT;
                            else targetType = TargetType.SINE_WAVE;
                        }
                    }

                    let vx = Math.cos(angle) * speed;
                    let vy = Math.sin(angle) * speed;
                    
                    if (targetType === TargetType.TOUGH) {
                        targetHealth = 3; vx *= 0.8; vy *= 0.8;
                    } else if (targetType === TargetType.STATIONARY) {
                        vx = 0; vy = 0;
                    } else if (targetType === TargetType.SINE_WAVE) {
                        vy = 0;
                        vx = (Math.random() > 0.5 ? 1 : -1) * speed * 1.2;
                        startY = Math.max(radius + 70, Math.min(playableHeight - radius - 70, startY)); 
                    }

                    state.targets.push({
                        id: Math.random().toString(),
                        x: startX, y: startY, vx, vy,
                        color: randomColor,
                        radius: radius,
                        rotation: Math.random() * 360,
                        rotationSpeed: (Math.random() - 0.5) * 2,
                        type: targetType,
                        shape: targetShape,
                        health: targetHealth,
                        colorShiftTimer: 0,
                        initialY: startY,
                        timeOffset: Math.random() * 1000
                    });
                }
            }
        }
    }

    // 3. Physics & Logic
    if (!isTutorial) {
        const scoreMilestone = Math.floor(state.score / 20);
        if (scoreMilestone > state.lastScoreMilestone) {
            state.lastScoreMilestone = scoreMilestone;
            state.speedMultiplier = Math.min(2.5, state.speedMultiplier + 0.05);
        }

        state.targets.forEach(target => {
            // Boss Constraints
            if (target.type === TargetType.BOSS) {
                if (target.y < target.radius) {
                    // If it's entering, let it enter, otherwise cap it
                    if (target.vy < 0) target.vy = Math.abs(target.vy);
                }
                // Keep Boss in top area
                if (target.y > playableHeight * 0.6) target.vy = -Math.abs(target.vy) * 1.2;

                // Abilities
                target.colorShiftTimer = (target.colorShiftTimer || 0) + deltaTime;
                if (target.colorShiftTimer > 2500) {
                    target.colorShiftTimer = 0;
                    const remainingColors = COLOR_KEYS.filter(c => c !== target.color);
                    target.color = remainingColors[Math.floor(Math.random() * remainingColors.length)];
                    spawnHitParticles(target.x, target.y, '#ffffff', TargetType.COLOR_SHIFT);
                    playSound('whir', isMuted); // Audio feedback for boss shift
                }

                target.summonTimer = (target.summonTimer || 0) - deltaTime;
                if (target.summonTimer <= 0) {
                    target.summonTimer = 5000; 
                    for (let k=0; k<2; k++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = target.radius + 40;
                        const mX = target.x + Math.cos(angle) * dist;
                        const mY = target.y + Math.sin(angle) * dist;
                        state.targets.push({
                            id: `minion-${Date.now()}-${k}`,
                            x: mX, y: mY, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                            color: target.color, radius: GAME_CONFIG.TARGET_RADIUS * 0.8,
                            rotation: 0, rotationSpeed: 2, type: TargetType.NORMAL, shape: TargetShape.CIRCLE, health: 1
                        });
                        spawnHitParticles(mX, mY, COLORS[target.color], TargetType.SPLIT);
                    }
                    playSound('whir', isMuted);
                }
                
                if (target.maxHealth && target.health < target.maxHealth * 0.4) {
                    target.rotationSpeed = 5;
                    if (Math.abs(target.vx) < 2) target.vx *= 1.01;
                    if (Math.abs(target.vy) < 2) target.vy *= 1.01;
                }
            }
            else if (target.type === TargetType.COLOR_SHIFT) {
                target.colorShiftTimer = (target.colorShiftTimer || 0) + deltaTime;
                if (target.colorShiftTimer > 2500) { 
                    target.colorShiftTimer = 0;
                    const remainingColors = COLOR_KEYS.filter(c => c !== target.color);
                    target.color = remainingColors[Math.floor(Math.random() * remainingColors.length)];
                    spawnHitParticles(target.x, target.y, '#ffffff', TargetType.COLOR_SHIFT);
                }
            }

            if (target.type === TargetType.SINE_WAVE && target.initialY !== undefined) {
                target.x += target.vx * timeFactor;
                target.y = target.initialY + Math.sin((state.time + (target.timeOffset || 0)) * 0.004) * 60;
            } else {
                target.x += target.vx * timeFactor;
                target.y += target.vy * timeFactor;
            }
            
            target.rotation += target.rotationSpeed * timeFactor;
        });
    }

    // 4. Refined Collision Physics
    // Multi-step resolution for stability
    const physicsSteps = 2;
    for (let step = 0; step < physicsSteps; step++) {
        // Target-Target Collision
        for (let i = 0; i < state.targets.length; i++) {
            for (let j = i + 1; j < state.targets.length; j++) {
                const t1 = state.targets[i];
                const t2 = state.targets[j];
                
                const dx = t2.x - t1.x;
                const dy = t2.y - t1.y;
                const distSq = dx * dx + dy * dy;
                const minDist = t1.radius + t2.radius;
                
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist < 0.1) continue; // Avoid division by zero

                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = minDist - dist;

                    // Mass-based resolution
                    // Boss = 100, Tough = 2, Normal = 1, Stationary = Infinite
                    const getMass = (t: Target) => t.type === TargetType.BOSS ? 100 : (t.type === TargetType.TOUGH ? 3 : 1);
                    const m1 = t1.type === TargetType.STATIONARY ? Infinity : getMass(t1);
                    const m2 = t2.type === TargetType.STATIONARY ? Infinity : getMass(t2);
                    
                    const invM1 = m1 === Infinity ? 0 : 1/m1;
                    const invM2 = m2 === Infinity ? 0 : 1/m2;
                    const totalInvMass = invM1 + invM2;

                    if (totalInvMass > 0) {
                        // 1. Position Correction (Stop Sinking)
                        const correctionPercent = 0.8; // Correct 80% of overlap per step
                        const moveX = nx * (overlap * correctionPercent) / totalInvMass;
                        const moveY = ny * (overlap * correctionPercent) / totalInvMass;
                        
                        // NaN Checks
                        if (!isNaN(moveX) && !isNaN(moveY)) {
                            if (m1 !== Infinity) { t1.x -= moveX * invM1; t1.y -= moveY * invM1; }
                            if (m2 !== Infinity) { t2.x += moveX * invM2; t2.y += moveY * invM2; }
                        }

                        // 2. Impulse Resolution (Bounce)
                        const dvx = t2.vx - t1.vx;
                        const dvy = t2.vy - t1.vy;
                        const velAlongNormal = dvx * nx + dvy * ny;

                        if (velAlongNormal < 0) { // Only bounce if moving towards each other
                            const restitution = 0.9; // Bounciness
                            let j = -(1 + restitution) * velAlongNormal;
                            j /= totalInvMass;
                            
                            const impulseX = j * nx;
                            const impulseY = j * ny;
                            
                            if (!isNaN(impulseX) && !isNaN(impulseY)) {
                                if (m1 !== Infinity) { t1.vx -= impulseX * invM1; t1.vy -= impulseY * invM1; }
                                if (m2 !== Infinity) { t2.vx += impulseX * invM2; t2.vy += impulseY * invM2; }
                            }
                        }
                    }
                }
            }
        }

        // Wall Constraints
        state.targets.forEach(target => {
             if (target.x - target.radius < 0) {
                target.x = target.radius; 
                target.vx = Math.abs(target.vx) * 0.9; 
            } else if (target.x + target.radius > width) {
                target.x = width - target.radius; 
                target.vx = -Math.abs(target.vx) * 0.9;
            }

            if (target.type !== TargetType.SINE_WAVE && target.type !== TargetType.BOSS) {
                if (target.y - target.radius < 0) {
                    target.y = target.radius; 
                    target.vy = Math.abs(target.vy) * 0.9;
                } else if (target.y + target.radius > playableHeight) {
                    target.y = playableHeight - target.radius; 
                    target.vy = -Math.abs(target.vy) * 0.9;
                }
            } 
        });
    }

    // 5. Projectile Update
    let scoreChanged = false;
    let streakChanged = false;
    let levelChanged = false;

    for (const proj of state.projectilePool) {
        if (!proj.active) continue;

        proj.x += proj.vx * timeFactor;
        proj.y += proj.vy * timeFactor;

        // Trail
        if (Math.random() > 0.6) {
            spawnParticle({
                x: proj.x, y: proj.y, vx: 0, vy: 0, 
                life: 0.25, color: COLORS[proj.color], size: proj.radius * 0.6, type: 'TRAIL' 
            });
        }
        
        let hit = false;
        for (let i = state.targets.length - 1; i >= 0; i--) {
            const target = state.targets[i];
            const dx = proj.x - target.x;
            const dy = proj.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < target.radius + 8) { // Slight hit tolerance
                hit = true;
                const accuracy = Math.max(0, 1 - (dist / target.radius)); 

                if (proj.color === target.color) {
                    // HIT
                    state.streak += 1;
                    if (state.streak > sessionStatsRef.current.highestStreak) sessionStatsRef.current.highestStreak = state.streak;
                    
                    // Streak Feedback Sound (Every 5 hits)
                    if (state.streak > 0 && state.streak % 5 === 0) {
                        playSound('streak', isMuted);
                    }

                    streakChanged = true;

                    let destroy = true;
                    setShake(true);
                    state.shakeTimer = 150; 

                    if ((target.type === TargetType.TOUGH || target.type === TargetType.BOSS) && target.health > 1) {
                        destroy = false;
                        target.health -= 1;
                        state.score += (target.type === TargetType.BOSS ? 10 : 5) * diffSettings.scoreMultiplier;
                        state.scoreSinceLastBoss += 10;
                        scoreChanged = true;
                        playSound('heavy', isMuted); 
                        spawnHitParticles(proj.x, proj.y, theme === 'dark' ? '#ffffff' : '#000000', TargetType.TOUGH, accuracy);
                    }

                    if (destroy) {
                        let multiplier = 1;
                        if (state.streak > 5) multiplier = 1.5;
                        if (state.streak > 10) multiplier = 2;
                        if (state.streak > 20) multiplier = 3;
                        
                        const baseScore = TARGET_SCORES[target.type] || 10;
                        state.score += baseScore * diffSettings.scoreMultiplier * multiplier;
                        
                        // Prevent instant level skipping by capping boss kill progress
                        if (target.type === TargetType.BOSS) {
                             state.scoreSinceLastBoss += 50; // Minimal progress for killing boss, since it resets anyway
                        } else {
                             state.scoreSinceLastBoss += baseScore * multiplier;
                        }
                        
                        scoreChanged = true;
                        
                        if (target.type === TargetType.BOSS) {
                             state.level++;
                             playSound('levelUp', isMuted); // Level Up Sound
                             state.bossActive = false;
                             state.scoreSinceLastBoss = 0; // Reset progress for next level
                             levelChanged = true;
                             setIsBossFight(false); 
                             sessionStatsRef.current.bossKills++;
                             sessionStatsRef.current.highestLevel = Math.max(sessionStatsRef.current.highestLevel, state.level);
                             state.speedMultiplier += 0.2;
                             state.baseSpawnInterval = Math.max(300, state.baseSpawnInterval - 50);
                             playSound('pop', isMuted); 
                        } else {
                            // Don't play regular score sound if we played a streak sound this frame, 
                            // unless it's a split which has its own sound
                            if (target.type === TargetType.SPLIT) {
                                playSound('pop', isMuted);
                            } else if (state.streak % 5 !== 0) {
                                playSound('score', isMuted);
                            }
                        }
                        
                        // Stats tracking
                        sessionStatsRef.current.targetsHit++;
                        if (target.type === TargetType.TOUGH) sessionStatsRef.current.toughKills++;
                        if (target.type === TargetType.SPLIT) sessionStatsRef.current.splitKills++;
                        if (target.type === TargetType.STATIONARY) sessionStatsRef.current.stationaryKills++;
                        if (target.type === TargetType.COLOR_SHIFT) sessionStatsRef.current.colorShiftKills++;
                        if (target.type === TargetType.SINE_WAVE) sessionStatsRef.current.sineWaveKills++;

                        state.targets.splice(i, 1);
                        spawnHitParticles(target.x, target.y, COLORS[target.color], target.type, accuracy + 0.5); 

                        if (target.type === TargetType.SPLIT) {
                            const childRadius = target.radius * 0.6;
                            for (let k = 0; k < 2; k++) {
                                const angleOffset = (k === 0 ? 1 : -1) * (Math.PI / 3); 
                                const baseAngle = Math.atan2(target.vy, target.vx);
                                const newAngle = baseAngle + angleOffset;
                                const speed = Math.max(4, Math.sqrt(target.vx*target.vx + target.vy*target.vy) * 1.5);
                                state.targets.push({
                                    id: Math.random().toString(),
                                    x: target.x + Math.cos(newAngle) * 20,
                                    y: target.y + Math.sin(newAngle) * 20,
                                    vx: Math.cos(newAngle) * speed, vy: Math.sin(newAngle) * speed,
                                    color: target.color, radius: childRadius,
                                    rotation: 0, rotationSpeed: (Math.random() - 0.5) * 8,
                                    type: TargetType.NORMAL, shape: TargetShape.CIRCLE, health: 1
                                });
                            }
                        }
                    }

                } else {
                    // MISMATCH
                    state.streak = 0;
                    setStreak(0); 
                    state.isEnding = true;
                    playSound('gameover', isMuted);
                    setShake(true);
                    state.shakeTimer = 500; 
                    spawnHitParticles(proj.x, proj.y, '#94a3b8', 'MISS');
                    
                    sessionStatsRef.current.targetsMissed++;
                    sessionStatsRef.current.totalScore = Math.floor(state.score);

                    setTimeout(() => { onGameOver(Math.floor(state.score), sessionStatsRef.current); }, 1000);
                }
                proj.active = false;
                break; 
            }
        }
        if (!hit && (proj.x < -50 || proj.x > width + 50 || proj.y < -50 || proj.y > height + 50)) {
             proj.active = false;
        }
    }

    if (scoreChanged) {
        setScore(Math.floor(state.score));
        const threshold = GAME_CONFIG.POINTS_PER_LEVEL + (state.level * 100);
        setLevelProgress(Math.min(100, (state.scoreSinceLastBoss / threshold) * 100));
    }
    if (streakChanged) setStreak(state.streak);
    if (levelChanged) {
        setLevel(state.level);
        setLevelProgress(0);
    }

    setActiveParticles(activeParticlesList);
    setProjectiles(state.projectilePool.filter(p => p.active));
    setTargets([...state.targets]);

    requestRef.current = requestAnimationFrame(animate);
  }, [onGameOver, isMuted, difficulty, diffSettings, tutorialStep, theme, spawnHitParticles, spawnParticle]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const getDiffIcon = () => {
      if (difficulty === Difficulty.EASY) return <Feather size={16} className="text-green-400" />;
      if (difficulty === Difficulty.MEDIUM) return <TargetIcon size={16} className="text-blue-400" />;
      return <Flame size={16} className="text-red-400" />;
  };

  const currentMultiplier = streak > 20 ? 3 : streak > 10 ? 2 : streak > 5 ? 1.5 : 1;
  const controlBarClass = theme === 'dark' ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-200 shadow-lg';
  const textColor = theme === 'dark' ? 'text-white/90' : 'text-slate-800';

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden cursor-crosshair touch-action-none ${shake ? 'shake' : ''}`}>
      
      {tutorialStep > 0 && (
        <div className="absolute inset-0 z-[55] bg-black/60 backdrop-blur-sm flex flex-col">
            {/* Tutorial UI */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white space-y-6">
                <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                    <Hand size={40} />
                </div>
                <h2 className="text-3xl font-black tracking-tight">How to Play</h2>
                {tutorialStep === 1 && (
                  <>
                    <p className="text-lg text-slate-300 max-w-xs leading-relaxed">
                        Tap the colored buttons at the bottom to switch your ball's color.
                    </p>
                    <div className="animate-bounce mt-8">
                         <span className="text-sm uppercase tracking-widest text-indigo-400 font-bold">Tap a color below</span>
                    </div>
                  </>
                )}
                {tutorialStep === 2 && (
                  <>
                    <p className="text-lg text-slate-300 max-w-xs leading-relaxed">
                        Tap anywhere on the screen to shoot! Match the ball color to the target ring.
                    </p>
                     <div className="animate-pulse mt-8 p-4 border border-white/20 rounded-xl bg-white/5">
                         <span className="text-sm font-bold text-white">Target Locked! Tap to Fire!</span>
                    </div>
                  </>
                )}
            </div>
            <button 
                onClick={() => { setTutorialStep(0); onTutorialComplete(); }}
                className="absolute top-8 right-8 text-white/50 hover:text-white underline text-sm"
             >
                 Skip Tutorial
             </button>
        </div>
      )}

      {/* UI Header */}
      <div className="absolute top-6 left-6 z-50 pointer-events-none flex flex-col gap-2 w-64">
        <div className="flex items-end gap-2">
            <div className={`text-5xl font-black select-none drop-shadow-lg tracking-tighter ${textColor}`}>
                {score}
            </div>
            
            {/* Improved Multiplier Badge */}
            <div className={`transition-all duration-300 ${currentMultiplier > 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <div className="flex items-center gap-1 px-2 py-1 mb-2 bg-yellow-500 text-white rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-bounce">
                     <Crosshair size={12} className="stroke-[3]" />
                     <div className="flex flex-col leading-none">
                        <span className="text-[8px] font-black uppercase opacity-80">Combo</span>
                        <span className="text-sm font-black">x{currentMultiplier}</span>
                     </div>
                </div>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm border ${theme === 'dark' ? 'bg-black/30 border-white/5 text-white/70' : 'bg-white/50 border-slate-300 text-slate-600'}`}>
                {getDiffIcon()}
                <span className="text-xs font-bold tracking-wider uppercase">{difficulty}</span>
            </div>
            
            {/* Level Indicator / Boss Bar */}
            <div className={`relative overflow-hidden flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm border min-w-[80px] ${theme === 'dark' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-purple-100 border-purple-300 text-purple-700'}`}>
                <div 
                    className={`absolute left-0 top-0 h-full transition-all duration-300 ease-out ${isBossFight ? 'bg-red-500/40 animate-pulse' : 'bg-purple-500/30'}`} 
                    style={{ width: `${isBossFight ? 100 : levelProgress}%` }} 
                />
                <div className="relative z-10 flex items-center gap-1 w-full justify-center">
                    {isBossFight ? <Skull size={12} className="text-red-400" /> : <Crown size={12} />}
                    <span className={`text-xs font-bold tracking-wider uppercase ${isBossFight ? 'text-red-400' : ''}`}>
                        {isBossFight ? 'BOSS' : `LVL ${level}`}
                    </span>
                </div>
            </div>
        </div>
        
        {streak > 2 && (
             <div className="flex items-center gap-1 mt-1 text-orange-500 font-bold text-xs tracking-widest animate-pulse">
                <Zap size={12} /> STREAK {streak}
             </div>
        )}
      </div>

      {/* Render Entities */}
      <div className="relative w-full h-full pointer-events-none">
        {targets.map(target => {
            const velocityAngle = Math.atan2(target.vy, target.vx) * (180 / Math.PI);
            const isStationary = target.type === TargetType.STATIONARY;
            const isBoss = target.type === TargetType.BOSS;
            
            let scale = 1;
            if (target.type === TargetType.SINE_WAVE) {
                 const sineTime = (gameStateRef.current.time + (target.timeOffset || 0));
                 const sineValue = Math.sin(sineTime * 0.004);
                 scale = 1 + 0.1 * Math.abs(sineValue); 
            }

            return (
            <div
                key={target.id}
                className="absolute flex items-center justify-center"
                style={{
                    width: target.radius * 2,
                    height: target.radius * 2,
                    left: target.x - target.radius,
                    top: target.y - target.radius,
                    transform: `scale(${scale})`,
                    zIndex: isBoss ? 20 : 10
                }}
            >
                {isBoss && target.maxHealth && (
                    <div className={`absolute -top-10 w-24 h-2 bg-black/50 rounded-full overflow-hidden border ${target.health < target.maxHealth * 0.4 ? 'border-red-500 animate-pulse' : 'border-white/20'}`}>
                        <div 
                            className={`h-full transition-all duration-200 ${target.health < target.maxHealth * 0.4 ? 'bg-red-600' : 'bg-red-500'}`} 
                            style={{ width: `${(target.health / target.maxHealth) * 100}%` }} 
                        />
                    </div>
                )}

                <div 
                    className={`absolute inset-0 flex items-center justify-center transition-colors duration-200`}
                    style={{
                        transform: `rotate(${target.rotation}deg)`,
                        filter: isBoss ? 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' : 'none'
                    }}
                >
                    {target.shape === TargetShape.CIRCLE && (
                        <div 
                            className="w-full h-full rounded-full border-[4px]"
                            style={{
                                borderColor: COLORS[target.color],
                                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                                boxShadow: theme === 'dark' 
                                    ? `0 0 20px ${COLORS[target.color]}60, inset 0 0 10px ${COLORS[target.color]}40`
                                    : `0 4px 10px ${COLORS[target.color]}40`
                            }}
                        />
                    )}
                    {target.shape === TargetShape.SQUARE && (
                        <div 
                            className="w-full h-full rounded-lg border-[4px]"
                            style={{
                                borderColor: COLORS[target.color],
                                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                                boxShadow: `0 0 15px ${COLORS[target.color]}40`
                            }}
                        />
                    )}
                    {target.shape === TargetShape.DIAMOND && (
                        <div 
                            className="w-[80%] h-[80%] rounded-lg border-[4px] rotate-45"
                            style={{
                                borderColor: COLORS[target.color],
                                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
                                boxShadow: `0 0 15px ${COLORS[target.color]}40`
                            }}
                        />
                    )}
                    {target.shape === TargetShape.TRIANGLE && (
                         <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
                             <polygon 
                                points="50,10 90,85 10,85"
                                fill={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)'}
                                stroke={COLORS[target.color]}
                                strokeWidth="5"
                                strokeLinejoin="round"
                                style={{ filter: `drop-shadow(0 0 8px ${COLORS[target.color]}80)` }}
                             />
                         </svg>
                    )}
                    {target.shape === TargetShape.STAR && (
                        <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible animate-pulse">
                            <polygon 
                                points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
                                fill={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)'}
                                stroke={COLORS[target.color]}
                                strokeWidth="4"
                                strokeLinejoin="round"
                                style={{ filter: `drop-shadow(0 0 15px ${COLORS[target.color]})` }}
                            />
                        </svg>
                    )}

                    {target.type === TargetType.SPLIT && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[20%] h-[20%] bg-white rounded-full animate-ping opacity-50" />
                        </div>
                    )}
                    {target.type === TargetType.TOUGH && target.health >= 2 && (
                         <div className={`absolute w-[60%] h-[60%] border-2 rounded-full opacity-60`} style={{ borderColor: COLORS[target.color] }} />
                    )}
                     {target.type === TargetType.BOSS && (
                         <div className="absolute w-[40%] h-[40%] bg-white/20 rounded-full animate-ping" />
                    )}
                </div>

                {!isStationary && !isBoss && (
                    <div 
                        className="absolute w-full h-full flex items-center justify-center"
                        style={{ transform: `rotate(${velocityAngle}deg)` }}
                    >
                        <div className={`absolute -right-3 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] ${theme === 'dark' ? 'border-l-white/50' : 'border-l-slate-800/50'}`} />
                    </div>
                )}
            </div>
        )})}

        {activeParticles.map(p => {
            const isRing = p.type === 'RING';
            return (
            <div 
                key={p.id}
                className={`absolute rounded-full ${isRing ? 'border-2' : ''}`}
                style={{
                    backgroundColor: isRing ? 'transparent' : p.color,
                    borderColor: isRing ? p.color : 'transparent',
                    left: p.x,
                    top: p.y,
                    width: p.size,
                    height: p.size,
                    opacity: isRing ? p.life : (p.type === 'TRAIL' ? p.life * 0.5 : p.life),
                    transform: isRing ? 'translate(-50%, -50%)' : `translate(-50%, -50%) scale(${p.life}) rotate(${p.rotation || 0}deg)`,
                    boxShadow: isRing ? `0 0 10px ${p.color}` : (p.type === 'TRAIL' ? 'none' : `0 0 ${p.size}px ${p.color}`),
                    borderRadius: p.type === 'DEBRIS' ? '0%' : '50%'
                }}
            />
        )})}

        {projectiles.map(p => (
            <div 
                key={p.id}
                className="absolute rounded-full"
                style={{
                    width: p.radius * 2,
                    height: p.radius * 2,
                    backgroundColor: COLORS[p.color],
                    left: p.x - p.radius,
                    top: p.y - p.radius,
                    boxShadow: `0 0 15px ${COLORS[p.color]}`
                }}
            />
        ))}
        
        <div 
            className={`absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20 transition-all duration-100 ${tutorialStep === 1 ? 'z-[70]' : ''}`}
            style={{
                bottom: GAME_CONFIG.CONTROLS_HEIGHT + 20,
                transform: shooterPulse ? 'translate(-50%, 0) scale(1.1)' : 'translate(-50%, 0) scale(1)',
                filter: shooterPulse ? 'brightness(1.3)' : 'none'
            }}
        >
            <div 
                className="rounded-full shadow-2xl relative transition-all duration-200 ease-out"
                style={{
                    width: GAME_CONFIG.SHOOTER_RADIUS * 2,
                    height: GAME_CONFIG.SHOOTER_RADIUS * 2,
                    backgroundColor: COLORS[selectedColor],
                    boxShadow: `0 0 30px ${COLORS[selectedColor]}80`
                }}
            >
                <div className="absolute inset-0 rounded-full border-4 border-white/30 scale-90"></div>
            </div>
             <div className="w-1 h-4 mt-2 bg-white/20 rounded-full"></div>
        </div>
      </div>

      <div 
        className={`absolute bottom-0 left-0 w-full backdrop-blur-md border-t z-30 flex items-center justify-evenly px-4 pb-6 pt-4 ${controlBarClass} ${tutorialStep === 1 ? 'z-[60] ring-2 ring-white/50' : ''}`}
        style={{ height: GAME_CONFIG.CONTROLS_HEIGHT }}
        onClick={(e) => e.stopPropagation()}
      >
        {COLOR_KEYS.map((colorKey) => (
            <button
                key={colorKey}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault(); 
                    handleColorSelect(colorKey);
                }}
                className={`
                    relative w-16 h-16 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center
                    ${selectedColor === colorKey ? 'scale-110 ring-4 ring-white shadow-lg' : 'opacity-80 hover:opacity-100'}
                `}
                style={{ 
                    backgroundColor: COLORS[colorKey],
                    boxShadow: selectedColor === colorKey ? `0 0 20px ${COLORS[colorKey]}` : 'none'
                }}
            >
                {selectedColor === colorKey && <div className="w-4 h-4 bg-white rounded-full shadow-sm" />}
            </button>
        ))}
      </div>
    </div>
  );
};