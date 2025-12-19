export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  speed: number;
}

export interface Player extends Entity {
  experience: number;
  level: number; // 1 to 5
  maxHealth: number;
  currentHealth: number;
  targetPosition: Vector2; // Mouse position in world
  speciesName: string;
  particleCount: number; // Spendable resource
  isSkillActive: boolean; // Is the player holding the skill button?
}

export interface Enemy extends Entity {
  behavior: 'wander' | 'chase' | 'flee';
  targetId?: string;
  changeDirTimer: number;
  speciesLevel: number; // Used to determine visual shape
}

export interface Particle extends Entity {
  value: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  particles: Particle[];
  worldSize: { width: number; height: number };
  isRunning: boolean;
  isGameOver: boolean;
  isEvolving: boolean;
  score: number;
}

export interface SkillInfo {
  name: string;
  description: string;
  costPerSecond: number;
  speedMult: number;
}

export interface SpeciesInfo {
  name: string;
  description: string;
  color: string;
  baseRadius: number;
  speedFactor: number;
  skill: SkillInfo;
}
