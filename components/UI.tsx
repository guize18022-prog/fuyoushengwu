import React, { useEffect, useState } from 'react';
import { SPECIES_DATA, MAX_LEVEL } from '../constants';
import { SpeciesInfo } from '../types';
import { generateEvolutionLore } from '../services/geminiService';
import { RefreshCw, Play, Crown, Skull, Zap } from 'lucide-react';

interface HUDProps {
  score: number;
  level: number;
  exp: number;
  maxExp: number;
  particleCount: number;
}

export const HUD: React.FC<HUDProps> = ({ score, level, exp, maxExp, particleCount }) => {
  const species = SPECIES_DATA[level];
  const progress = Math.min(100, (exp / maxExp) * 100);
  const skill = species.skill;
  
  // Check if player has enough for ~1 second of usage to consider "ready" roughly, 
  // or just if they have any > 0
  const canUseSkill = particleCount > 0;

  return (
    <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start z-10">
      
      {/* Top Left: Player Status */}
      <div className="flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-3 rounded-lg text-white shadow-lg min-w-[280px]">
          <h1 className="text-xl font-bold text-cyan-400 mb-1">{species.name}</h1>
          <div className="text-xs text-slate-400 mb-2">{species.description}</div>
          
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-2">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-slate-300 mb-3">
            <span>等级 {level} / {MAX_LEVEL}</span>
            <span>{Math.floor(exp)} / {maxExp} 经验</span>
          </div>

          {/* Particles Resource & Skill */}
          <div className="flex items-center gap-4 border-t border-slate-700 pt-3">
             <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-bold">粒子</span>
                <span className="text-xl font-mono text-yellow-300 font-bold tracking-wider">{Math.floor(particleCount)}</span>
             </div>
             
             <div className="flex-1">
               <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex justify-between">
                  <span>技能: {skill.name}</span>
                  <span className="text-cyan-200">-{skill.costPerSecond}/秒</span>
               </div>
               <div className={`
                 relative h-8 rounded bg-slate-800 border 
                 ${canUseSkill ? 'border-cyan-600' : 'border-red-900'}
                 flex items-center justify-center overflow-hidden transition-colors
               `}>
                 {/* Visual bar representing ammo capacity? For now just a status container */}
                 <div className="relative z-10 flex items-center gap-2 text-xs font-bold">
                    <Zap className={`w-3 h-3 ${canUseSkill ? 'text-yellow-400' : 'text-slate-500'}`} />
                    <span className={canUseSkill ? 'text-white' : 'text-slate-400'}>
                       {canUseSkill ? '按住空格' : '能量不足'}
                    </span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Top Right: Score */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-3 rounded-lg text-white shadow-lg">
        <div className="text-2xl font-bold text-yellow-400 text-right">{score.toLocaleString()}</div>
        <div className="text-xs text-slate-400 text-right">生物质总量</div>
      </div>
    </div>
  );
};

interface ModalProps {
  title: string;
  children: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ title, children, actionLabel, onAction, icon, isLoading }) => {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-center mb-6">
           {icon}
        </div>
        <h2 className="text-3xl font-bold text-center text-white mb-4 font-serif">{title}</h2>
        <div className="text-slate-300 text-center mb-8 leading-relaxed">
          {children}
        </div>
        <button
          onClick={onAction}
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
        >
          {isLoading ? 'Processing DNA...' : actionLabel}
        </button>
      </div>
    </div>
  );
};

interface EvolutionModalProps {
  level: number;
  onContinue: () => void;
}

export const EvolutionModal: React.FC<EvolutionModalProps> = ({ level, onContinue }) => {
  const [lore, setLore] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const species = SPECIES_DATA[level];

  useEffect(() => {
    let mounted = true;
    const fetchLore = async () => {
      setLoading(true);
      const text = await generateEvolutionLore(level, species);
      if (mounted) {
        setLore(text);
        setLoading(false);
      }
    };
    fetchLore();
    return () => { mounted = false; };
  }, [level, species]);

  return (
    <Modal
      title="Metamorphosis Complete"
      actionLabel="Begin Next Stage"
      onAction={onContinue}
      isLoading={loading}
      icon={<RefreshCw className="w-16 h-16 text-cyan-400 animate-spin-slow" />}
    >
      <div className="space-y-4">
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-sm text-cyan-400 font-bold uppercase tracking-wider mb-1">New Species Acquired</div>
          <div className="text-2xl font-bold text-white mb-2">{species.name}</div>
          <div className="text-slate-300 italic min-h-[60px]">
            {loading ? (
              <span className="animate-pulse">Analyzing genetic structure...</span>
            ) : (
              `"${lore}"`
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-800/30 p-2 rounded text-center">
            <div className="text-slate-500">Size</div>
            <div className="text-white font-bold text-lg">{(species.baseRadius * 2)}μm</div>
          </div>
          <div className="bg-slate-800/30 p-2 rounded text-center">
            <div className="text-slate-500">Speed</div>
            <div className="text-white font-bold text-lg">{Math.round(species.speedFactor * 100)}%</div>
          </div>
        </div>

        <div className="bg-cyan-900/30 border border-cyan-800/50 p-3 rounded text-center">
             <div className="text-xs text-cyan-400 uppercase font-bold mb-1">New Ability Unlocked</div>
             <div className="text-white font-bold">{species.skill.name}</div>
             <div className="text-xs text-cyan-200 mt-1 opacity-75">{species.skill.description}</div>
        </div>

      </div>
    </Modal>
  );
};
