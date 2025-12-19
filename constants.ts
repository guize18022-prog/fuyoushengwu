import { SpeciesInfo } from './types';

export const WORLD_WIDTH = 8000;
export const WORLD_HEIGHT = 8000;

export const INITIAL_PLAYER_RADIUS = 15;
export const MAX_LEVEL = 8;

// Experience required to reach next level
export const LEVEL_THRESHOLDS = [0, 60, 200, 500, 1200, 3000, 7000, 15000, 30000];

export const SPECIES_DATA: Record<number, SpeciesInfo> = {
  1: {
    name: "Microdust (微尘)",
    description: "A tiny speck of consciousness floating in the void.",
    color: "#f8fafc", // White/Slate-50
    baseRadius: 15,
    speedFactor: 1.0,
    skill: {
      name: "Drift Surge",
      description: "Burn energy for a quick boost.",
      costPerSecond: 10,
      speedMult: 2.0,
    }
  },
  2: {
    name: "Protozoa (浮游)",
    description: "A simple single-celled organism seeking sustenance.",
    color: "#22d3ee", // Cyan-400
    baseRadius: 45, 
    speedFactor: 0.9,
    skill: {
      name: "Flagella Dash",
      description: "Propel forward rapidly.",
      costPerSecond: 15,
      speedMult: 2.2,
    }
  },
  3: {
    name: "Larva (幼虫)",
    description: "A segmented creature beginning to understand the hunt.",
    color: "#facc15", // Yellow-400
    baseRadius: 85, 
    speedFactor: 0.85,
    skill: {
      name: "Rapid Swim",
      description: "Sustained speed for chasing prey.",
      costPerSecond: 20,
      speedMult: 2.5,
    }
  },
  4: {
    name: "Hunter (掠食者)",
    description: "An aquatic predator with developed senses.",
    color: "#f472b6", // Pink-400
    baseRadius: 160, 
    speedFactor: 0.8,
    skill: {
      name: "Predator Lunge",
      description: "Explosive speed to catch anything.",
      costPerSecond: 30,
      speedMult: 3.5,
    }
  },
  5: {
    name: "Leviathan (巨兽)",
    description: "The apex of local evolution, a cosmic entity.",
    color: "#a78bfa", // Violet-400
    baseRadius: 300, 
    speedFactor: 0.7,
    skill: {
      name: "Cosmic Warp",
      description: "Bend space to move instantly.",
      costPerSecond: 50,
      speedMult: 4.0,
    }
  },
  6: {
    name: "Void Wraith (虚空幽灵)",
    description: "An ethereal spirit composed of dark matter and stardust.",
    color: "#60a5fa", // Blue-400
    baseRadius: 500, 
    speedFactor: 0.65,
    skill: {
      name: "Phantom Phase",
      description: "Become immaterial and surge forward.",
      costPerSecond: 70,
      speedMult: 4.5,
    }
  },
  7: {
    name: "Astral Colossus (星界巨像)",
    description: "A living fortress forged from dead stars.",
    color: "#f97316", // Orange-500
    baseRadius: 800, 
    speedFactor: 0.6,
    skill: {
      name: "Titan Charge",
      description: "Unstoppable momentum.",
      costPerSecond: 90,
      speedMult: 5.0,
    }
  },
  8: {
    name: "Singularity (宇宙奇点)",
    description: "The end and the beginning. A living black hole.",
    color: "#18181b", // Zinc-950 (Black)
    baseRadius: 1200, 
    speedFactor: 0.5,
    skill: {
      name: "Event Horizon",
      description: "Consume everything in your path.",
      costPerSecond: 120,
      speedMult: 6.0,
    }
  }
};

export const ENEMY_SPAWN_COUNT = 250; 
export const PARTICLE_SPAWN_COUNT = 800;
export const LARGE_PARTICLE_SPAWN_COUNT = 100; // ~1/8th of regular particles
export const LARGE_PARTICLE_VALUE = 25;
