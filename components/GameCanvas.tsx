import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GameState, 
  Player, 
  Particle, 
  Enemy, 
  Vector2, 
  SpeciesInfo 
} from '../types';
import { 
  WORLD_WIDTH, 
  WORLD_HEIGHT, 
  SPECIES_DATA, 
  LEVEL_THRESHOLDS, 
  PARTICLE_SPAWN_COUNT, 
  LARGE_PARTICLE_SPAWN_COUNT,
  LARGE_PARTICLE_VALUE,
  ENEMY_SPAWN_COUNT,
  MAX_LEVEL
} from '../constants';

interface GameCanvasProps {
  onScoreUpdate: (score: number, level: number, exp: number, maxExp: number, particles: number) => void;
  onEvolutionStart: (level: number) => void;
  onGameOver: (score: number) => void;
  gameActive: boolean;
  gameResetTrigger: number;
}

// Utility functions
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const getDistance = (v1: Vector2, v2: Vector2) => Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onScoreUpdate, 
  onEvolutionStart, 
  onGameOver,
  gameActive,
  gameResetTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const mouseRef = useRef<Vector2>({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 });
  const viewportRef = useRef<Vector2>({ x: 0, y: 0 });

  // --- Initialization ---
  const initGame = useCallback(() => {
    const initialLevel = 1;
    const species = SPECIES_DATA[initialLevel];

    const player: Player = {
      id: 'player',
      position: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      radius: species.baseRadius,
      color: species.color,
      speed: 4 * species.speedFactor,
      experience: 0,
      level: initialLevel,
      maxHealth: 100,
      currentHealth: 100,
      targetPosition: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
      speciesName: species.name,
      particleCount: 20, 
      isSkillActive: false,
    };

    // Standard Particles (Value 1)
    const smallParticles: Particle[] = Array.from({ length: PARTICLE_SPAWN_COUNT }).map((_, i) => ({
      id: `p-${i}`,
      position: { x: randomRange(0, WORLD_WIDTH), y: randomRange(0, WORLD_HEIGHT) },
      velocity: { x: randomRange(-0.2, 0.2), y: randomRange(-0.2, 0.2) },
      radius: randomRange(3, 8),
      color: `hsla(${randomRange(160, 240)}, 80%, 75%, 0.8)`,
      speed: 0,
      value: 1
    }));

    // Large Particles (Value 25)
    const largeParticles: Particle[] = Array.from({ length: LARGE_PARTICLE_SPAWN_COUNT }).map((_, i) => ({
      id: `lp-${i}`,
      position: { x: randomRange(0, WORLD_WIDTH), y: randomRange(0, WORLD_HEIGHT) },
      velocity: { x: randomRange(-0.1, 0.1), y: randomRange(-0.1, 0.1) }, // Slower drift
      radius: randomRange(12, 18), // Distinctly larger
      color: '#fbbf24', // Amber/Gold to signify value
      speed: 0,
      value: LARGE_PARTICLE_VALUE
    }));

    const enemies: Enemy[] = Array.from({ length: ENEMY_SPAWN_COUNT }).map((_, i) => createEnemy(i, initialLevel));

    gameStateRef.current = {
      player,
      enemies,
      particles: [...smallParticles, ...largeParticles],
      worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
      isRunning: true,
      isGameOver: false,
      isEvolving: false,
      score: 0
    };
    lastTimeRef.current = Date.now();
  }, []);

  const createEnemy = (index: number, playerLevel: number): Enemy => {
    // Determine enemy level: Player Level +/- 3
    const levelVariance = Math.floor(Math.random() * 7) - 3; // Generates -3, -2, -1, 0, 1, 2, 3
    const level = Math.max(1, Math.min(MAX_LEVEL, playerLevel + levelVariance));
    const species = SPECIES_DATA[level];
    
    // Vary radius slightly for natural feel
    const radius = species.baseRadius * randomRange(0.85, 1.15);

    // Color code enemies based on threat
    let color = species.color;
    if (level > playerLevel) color = '#ef4444'; // Red (Danger)
    else if (level < playerLevel) color = '#86efac'; // Green (Food)

    return {
      id: `e-${index}-${Date.now()}`,
      position: { x: randomRange(0, WORLD_WIDTH), y: randomRange(0, WORLD_HEIGHT) },
      velocity: { x: 0, y: 0 },
      radius: radius,
      color: color, 
      speed: 2 * species.speedFactor * randomRange(0.8, 1.2),
      behavior: 'wander',
      changeDirTimer: 0,
      speciesLevel: level
    };
  };

  useEffect(() => {
    initGame();
  }, [initGame, gameResetTrigger]);


  // --- Game Loop ---
  const update = useCallback(() => {
    if (!gameStateRef.current || !gameStateRef.current.isRunning || !canvasRef.current) return;
    const state = gameStateRef.current;
    const now = Date.now();
    const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.1); 
    lastTimeRef.current = now;
    
    // 1. Update Player
    // Mouse is in screen coordinates, need to account for Zoom and Viewport
    // We calculate zoom based on level
    // Update zoom curve for higher levels (up to 8)
    const zoom = Math.max(0.05, 1 / (state.player.level * 0.6 + 0.4));
    
    // Convert screen mouse to world coordinates
    const worldMouseX = (mouseRef.current.x / zoom) + viewportRef.current.x;
    const worldMouseY = (mouseRef.current.y / zoom) + viewportRef.current.y;

    const dx = worldMouseX - state.player.position.x;
    const dy = worldMouseY - state.player.position.y;
    const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
    
    let currentSpeed = state.player.speed;
    const species = SPECIES_DATA[state.player.level];
    
    if (state.player.isSkillActive && state.player.particleCount > 0) {
        const cost = species.skill.costPerSecond * deltaTime;
        if (state.player.particleCount >= cost) {
            state.player.particleCount -= cost;
            currentSpeed *= species.skill.speedMult;
        } else {
            state.player.particleCount = 0;
        }
    }

    if (distanceToMouse > 5) {
      const angle = Math.atan2(dy, dx);
      // Lerp velocity for smoother turns
      const targetVx = Math.cos(angle) * currentSpeed;
      const targetVy = Math.sin(angle) * currentSpeed;
      state.player.velocity.x += (targetVx - state.player.velocity.x) * 0.1;
      state.player.velocity.y += (targetVy - state.player.velocity.y) * 0.1;
    } else {
      state.player.velocity.x *= 0.9;
      state.player.velocity.y *= 0.9;
    }

    state.player.position.x += state.player.velocity.x;
    state.player.position.y += state.player.velocity.y;

    state.player.position.x = Math.max(state.player.radius, Math.min(WORLD_WIDTH - state.player.radius, state.player.position.x));
    state.player.position.y = Math.max(state.player.radius, Math.min(WORLD_HEIGHT - state.player.radius, state.player.position.y));

    // 2. Update Particles
    state.particles.forEach(p => {
      // Gentle drift
      p.position.x += Math.sin(now * 0.001 + p.id.charCodeAt(0)) * 0.2;
      p.position.y += Math.cos(now * 0.001 + p.id.charCodeAt(0)) * 0.2;
      
      if (p.position.x < 0) p.position.x = WORLD_WIDTH;
      if (p.position.x > WORLD_WIDTH) p.position.x = 0;
      if (p.position.y < 0) p.position.y = WORLD_HEIGHT;
      if (p.position.y > WORLD_HEIGHT) p.position.y = 0;
    });

    // 3. Update Enemies
    state.enemies.forEach(enemy => {
      const distToPlayer = getDistance(enemy.position, state.player.position);
      
      let targetX = enemy.position.x;
      let targetY = enemy.position.y;

      // Detection range scales with size
      const detectionRange = 500 + state.player.radius;

      if (distToPlayer < detectionRange) {
        // Simple logic: if I'm bigger, chase. If smaller, flee.
        if (enemy.radius < state.player.radius * 0.9) {
          enemy.behavior = 'flee';
          const angle = Math.atan2(enemy.position.y - state.player.position.y, enemy.position.x - state.player.position.x);
          targetX = enemy.position.x + Math.cos(angle) * 200;
          targetY = enemy.position.y + Math.sin(angle) * 200;
        } else if (enemy.radius > state.player.radius * 1.1) {
          enemy.behavior = 'chase';
          targetX = state.player.position.x;
          targetY = state.player.position.y;
        } else {
           enemy.behavior = 'wander';
        }
      } else {
        enemy.behavior = 'wander';
      }

      if (enemy.behavior === 'wander') {
        enemy.changeDirTimer--;
        if (enemy.changeDirTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          enemy.velocity.x = Math.cos(angle) * enemy.speed * 0.5;
          enemy.velocity.y = Math.sin(angle) * enemy.speed * 0.5;
          enemy.changeDirTimer = randomRange(50, 150);
        }
      } else {
        const angle = Math.atan2(targetY - enemy.position.y, targetX - enemy.position.x);
        // Smooth turn for enemies too
        const targetVx = Math.cos(angle) * enemy.speed;
        const targetVy = Math.sin(angle) * enemy.speed;
        enemy.velocity.x += (targetVx - enemy.velocity.x) * 0.05;
        enemy.velocity.y += (targetVy - enemy.velocity.y) * 0.05;
      }

      enemy.position.x += enemy.velocity.x;
      enemy.position.y += enemy.velocity.y;

      enemy.position.x = Math.max(enemy.radius, Math.min(WORLD_WIDTH - enemy.radius, enemy.position.x));
      enemy.position.y = Math.max(enemy.radius, Math.min(WORLD_HEIGHT - enemy.radius, enemy.position.y));
    });

    // 4. Collision Detection
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      const dist = getDistance(state.player.position, p.position);
      // Generous pickup radius
      if (dist < state.player.radius + p.radius + 20) {
        state.score += 10 * p.value; // Score scales with value
        state.player.experience += p.value;
        state.player.particleCount += p.value; // Gain ammo based on particle value (1 or 25)
        
        // Respawn particle (keep it the same type/value)
        state.particles[i] = {
           ...p,
           position: { x: randomRange(0, WORLD_WIDTH), y: randomRange(0, WORLD_HEIGHT) }
        };
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const dist = getDistance(state.player.position, e.position);
      
      if (dist < (state.player.radius + e.radius) * 0.8) {
        if (state.player.radius > e.radius * 1.05) {
          // Eat
          const points = Math.floor(e.radius * 10);
          state.score += points;
          state.player.experience += Math.floor(e.radius * 2);
          state.player.particleCount += 10; 
          state.enemies[i] = createEnemy(i, state.player.level);
        } else if (e.radius > state.player.radius * 1.05) {
           // Die
           state.isRunning = false;
           state.isGameOver = true;
           onGameOver(state.score);
           return;
        }
      }
    }

    // 5. Level Up
    const nextLevelThreshold = LEVEL_THRESHOLDS[state.player.level];
    
    // Check if we have enough experience to evolve OR if we have completed the final level
    if (state.player.experience >= nextLevelThreshold) {
      if (state.player.level < MAX_LEVEL) {
          // Normal Evolution
          state.player.level++;
          state.player.experience = 0; 
          state.isEvolving = true;
          state.isRunning = false; 
          state.player.isSkillActive = false;
          
          const newSpecies = SPECIES_DATA[state.player.level];
          state.player.radius = newSpecies.baseRadius;
          state.player.color = newSpecies.color;
          state.player.speed = 4 * newSpecies.speedFactor;
          state.player.speciesName = newSpecies.name;
          
          onEvolutionStart(state.player.level);
      } else {
          // Victory! (Level > MAX_LEVEL triggers victory in App.tsx)
          state.isRunning = false;
          onEvolutionStart(state.player.level + 1);
      }
    }

    if (requestRef.current && requestRef.current % 4 === 0) {
       onScoreUpdate(
         state.score, 
         state.player.level, 
         state.player.experience, 
         LEVEL_THRESHOLDS[state.player.level] || 99999,
         state.player.particleCount
        );
    }

  }, [onScoreUpdate, onEvolutionStart, onGameOver]);

  // --- Input Handlers ---
  const handleMouseMove = (e: React.MouseEvent) => {
    // Just store raw screen coords, process in update loop
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameStateRef.current && gameStateRef.current.isRunning && e.button === 0) {
        gameStateRef.current.player.isSkillActive = true;
    }
    handleMouseMove(e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (gameStateRef.current) {
        gameStateRef.current.player.isSkillActive = false;
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && gameStateRef.current?.isRunning) {
      gameStateRef.current.player.isSkillActive = true;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && gameStateRef.current) {
      gameStateRef.current.player.isSkillActive = false;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const handleBlur = () => { if(gameStateRef.current) gameStateRef.current.player.isSkillActive = false; };
    window.addEventListener('blur', handleBlur);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp]);

  // --- Rendering ---
  const drawSpecies = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    radius: number, 
    color: string, 
    level: number, 
    velocity: Vector2, 
    isPlayer: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);

    const angle = Math.atan2(velocity.y, velocity.x);
    
    if (level === 1) {
        // Level 1: Microdust
        const glow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.5, color);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

    } else if (level === 2) {
        // Level 2: Protozoa
        ctx.rotate(angle);
        const time = Date.now() / 400;
        ctx.beginPath();
        ctx.fillStyle = isPlayer ? 'rgba(34, 211, 238, 0.4)' : color + '66'; 
        const segments = 12;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const r = radius * (0.9 + 0.1 * Math.sin(theta * 3 + time));
            const px = Math.cos(theta) * r;
            const py = Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isPlayer ? '#fff' : color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = isPlayer ? '#fff' : '#ffffffcc';
        ctx.arc(radius * 0.2, 0, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

    } else if (level === 3) {
        // Level 3: Larva
        ctx.rotate(angle);
        ctx.beginPath();
        const tailLen = radius * 2.0;
        const waveFreq = 0.3;
        const waveAmp = radius * 0.4;
        const offset = Date.now() / 80;
        ctx.moveTo(0, radius * 0.5); 
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const tx = -t * tailLen;
            const ty = Math.sin(tx * waveFreq + offset) * waveAmp * t + (radius * 0.5 * (1-t));
            ctx.lineTo(tx, ty);
        }
        for (let i = 20; i >= 0; i--) {
            const t = i / 20;
            const tx = -t * tailLen;
            const ty = Math.sin(tx * waveFreq + offset) * waveAmp * t - (radius * 0.5 * (1-t));
            ctx.lineTo(tx, ty);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.ellipse(0, 0, radius * 0.8, radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(radius * 0.4, -radius * 0.25, radius * 0.15, 0, Math.PI * 2);
        ctx.arc(radius * 0.4, radius * 0.25, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

    } else if (level === 4) {
        // Level 4: Hunter
        ctx.rotate(angle);
        if (isPlayer) {
             const glow = ctx.createLinearGradient(0, 0, -radius*2, 0);
             glow.addColorStop(0, color);
             glow.addColorStop(1, 'rgba(0,0,0,0)');
             ctx.fillStyle = glow;
             ctx.beginPath();
             ctx.moveTo(-radius * 0.5, 0);
             ctx.lineTo(-radius * 3, -radius * 0.5);
             ctx.lineTo(-radius * 3, radius * 0.5);
             ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(radius * 1.3, 0); 
        ctx.quadraticCurveTo(radius * 0.5, radius, -radius * 0.8, radius * 1.2); 
        ctx.lineTo(-radius * 0.4, 0); 
        ctx.lineTo(-radius * 0.8, -radius * 1.2); 
        ctx.quadraticCurveTo(radius * 0.5, -radius, radius * 1.3, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff88';
        ctx.lineWidth = radius * 0.05;
        ctx.beginPath();
        ctx.moveTo(radius * 0.8, 0);
        ctx.lineTo(-radius * 0.4, radius * 0.8);
        ctx.moveTo(radius * 0.8, 0);
        ctx.lineTo(-radius * 0.4, -radius * 0.8);
        ctx.stroke();

    } else if (level === 5) {
        // Level 5: Leviathan
        const t = Date.now() / 1000;
        ctx.rotate(t * 0.2);
        const halo = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.2);
        halo.addColorStop(0.5, color);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.save();
        ctx.rotate(t);
        ctx.beginPath();
        for(let i=0; i<4; i++) {
             ctx.rotate(Math.PI/2);
             ctx.moveTo(radius * 0.6, 0);
             ctx.lineTo(radius * 0.9, 0);
             ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 0.1);
        }
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.rotate(-t * 1.5);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
        ctx.setLineDash([20, 20]);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#1e1b4b'; 
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

    } else if (level === 6) {
        // Level 6: Void Wraith (New)
        // Ethereal, ghost-like with trailing smoke
        const t = Date.now() / 200;
        ctx.rotate(angle);
        
        // Ghostly trail
        ctx.globalCompositeOperation = 'screen';
        for(let i=0; i<3; i++) {
           ctx.beginPath();
           const lag = i * 50;
           const s = 1 - (i*0.2);
           const wave = Math.sin((Date.now() - lag)/300) * (radius * 0.3);
           ctx.arc(-radius + wave - (i*radius*0.5), 0, radius * 0.8 * s, 0, Math.PI*2);
           ctx.fillStyle = `rgba(96, 165, 250, ${0.4 - i*0.1})`;
           ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Core Head
        ctx.beginPath();
        ctx.moveTo(radius * 0.5, 0);
        ctx.bezierCurveTo(radius, radius, -radius, radius*1.5, -radius*0.5, 0);
        ctx.bezierCurveTo(-radius, -radius*1.5, radius, -radius, radius*0.5, 0);
        ctx.fillStyle = color; // Blue
        ctx.fill();

        // Glowing Core
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

    } else if (level === 7) {
        // Level 7: Astral Colossus (New)
        // Heavy Hexagonal Armor
        const t = Date.now() / 1500;
        ctx.rotate(t); // Slow rotation

        // Base Hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#431407'; // Dark bronze/brown
        ctx.fill();
        ctx.strokeStyle = color; // Orange
        ctx.lineWidth = 10;
        ctx.stroke();

        // Inner Mechanical details
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = (i/3) * Math.PI * 2 + t;
            ctx.moveTo(0,0);
            ctx.lineTo(Math.cos(a)*radius*0.9, Math.sin(a)*radius*0.9);
        }
        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Floating Shield Plates
        ctx.save();
        ctx.rotate(-t * 2);
        for(let i=0; i<4; i++) {
           const a = (i/4) * Math.PI * 2;
           const px = Math.cos(a) * radius * 1.4;
           const py = Math.sin(a) * radius * 1.4;
           ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
           ctx.fillRect(px - radius*0.2, py - radius*0.2, radius*0.4, radius*0.4);
        }
        ctx.restore();

    } else if (level >= 8) {
        // Level 8: Singularity (New)
        // Black Hole Effect
        
        // Accretion Disk (Gradient Ring)
        const grad = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius * 2);
        grad.addColorStop(0, '#000');
        grad.addColorStop(0.4, '#000');
        grad.addColorStop(0.45, '#fff'); // Event Horizon edge
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Matter spiral
        const t = Date.now() / 500;
        ctx.rotate(t);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<100; i++) {
            const angle = i * 0.5;
            const r = radius * 2 - (i * (radius/50));
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // The Void Center
        ctx.fillStyle = '#000';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10; // Subtle rim lighting
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameStateRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameStateRef.current;

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
    }

    // Calculate Zoom
    // Updated zoom curve to handle up to level 8 without everything becoming microscopic
    const zoom = Math.max(0.05, 1 / (state.player.level * 0.6 + 0.4));

    // Calculate Viewport top-left based on Player Center
    // We want Player to be at center of screen (width/2, height/2)
    // WorldCoord(Player) * Zoom - ViewportX = ScreenCenter
    // So ViewportX = WorldCoord(Player) * Zoom - ScreenCenter
    // NOTE: It is easier to translate the context so that (0,0) is the world origin, 
    // but zoomed and centered on player.
    
    // transform: translate(ScreenCenter) scale(zoom) translate(-PlayerX, -PlayerY)
    
    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // 1. Move to center of screen
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // 2. Scale
    ctx.scale(zoom, zoom);
    // 3. Move world so player is at (0,0) (relative to the previous translation)
    ctx.translate(-state.player.position.x, -state.player.position.y);
    
    // Update viewportRef for mouse calculation logic (approximate top-left world coord)
    viewportRef.current.x = state.player.position.x - (canvas.width / 2) / zoom;
    viewportRef.current.y = state.player.position.y - (canvas.height / 2) / zoom;

    // Draw World Borders
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 20;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Grid (Optimized: only draw what's visible)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    const gridSize = 200;
    
    // Calculate visible range in world coords
    const viewL = state.player.position.x - (canvas.width / 2) / zoom;
    const viewR = state.player.position.x + (canvas.width / 2) / zoom;
    const viewT = state.player.position.y - (canvas.height / 2) / zoom;
    const viewB = state.player.position.y + (canvas.height / 2) / zoom;

    const startX = Math.floor(Math.max(0, viewL) / gridSize) * gridSize;
    const endX = Math.min(WORLD_WIDTH, viewR);
    const startY = Math.floor(Math.max(0, viewT) / gridSize) * gridSize;
    const endY = Math.min(WORLD_HEIGHT, viewB);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, Math.max(0, viewT));
      ctx.lineTo(x, Math.min(WORLD_HEIGHT, viewB));
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(Math.max(0, viewL), y);
      ctx.lineTo(Math.min(WORLD_WIDTH, viewR), y);
    }
    ctx.stroke();

    // Particles
    // Optimization: only draw visible particles
    state.particles.forEach(p => {
      if (p.position.x < viewL - 50 || p.position.x > viewR + 50 || 
          p.position.y < viewT - 50 || p.position.y > viewB + 50) return;

      if (p.value > 1) {
          // Glow for large particles
          ctx.shadowBlur = 15;
          ctx.shadowColor = p.color;
      }

      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    // Enemies
    state.enemies.forEach(e => {
       if (e.position.x < viewL - e.radius || e.position.x > viewR + e.radius || 
           e.position.y < viewT - e.radius || e.position.y > viewB + e.radius) return;
           
        drawSpecies(
            ctx, 
            e.position.x, 
            e.position.y, 
            e.radius, 
            e.color, 
            e.speciesLevel, 
            e.velocity, 
            false
        );
    });

    // Player
    const p = state.player;
    const isAccelerating = p.isSkillActive && p.particleCount > 0;
    
    // Dash Trail
    if (isAccelerating) {
      ctx.beginPath();
      ctx.moveTo(p.position.x, p.position.y);
      ctx.lineTo(
        p.position.x - p.velocity.x * 20, // Longer trail due to scale
        p.position.y - p.velocity.y * 20
      );
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.radius * 0.8;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    drawSpecies(ctx, p.position.x, p.position.y, p.radius, isAccelerating ? '#ffffff' : p.color, p.level, p.velocity, true);

    ctx.restore();

  }, []);

  // --- Main Loop ---
  const tick = useCallback(() => {
    if (gameActive) {
        update();
        draw();
        requestRef.current = requestAnimationFrame(tick);
    }
  }, [gameActive, update, draw]);

  useEffect(() => {
    if (gameActive) {
        // RESUME LOGIC: Ensure the game loop flag is reset to true when the React prop becomes true.
        // This fixes the bug where the game stays frozen after the evolution modal closes.
        if (gameStateRef.current) {
            gameStateRef.current.isRunning = true;
            gameStateRef.current.isEvolving = false;
        }
        
        lastTimeRef.current = Date.now();
        requestRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameActive, tick]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default GameCanvas;
