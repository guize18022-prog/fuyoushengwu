import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { HUD, Modal, EvolutionModal } from './components/UI';
import { Play, Skull, Crown } from 'lucide-react';
import { MAX_LEVEL } from './constants';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<'start' | 'playing' | 'evolving' | 'gameover' | 'victory'>('start');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [maxExp, setMaxExp] = useState(100);
  const [particleCount, setParticleCount] = useState(0);
  
  // A trigger to reset the canvas game state
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleScoreUpdate = useCallback((
    newScore: number, 
    newLevel: number, 
    newExp: number, 
    newMaxExp: number,
    particles: number
  ) => {
    setScore(newScore);
    setLevel(newLevel);
    setExp(newExp);
    setMaxExp(newMaxExp);
    setParticleCount(particles);
  }, []);

  const handleEvolutionStart = useCallback((newLevel: number) => {
    setLevel(newLevel);
    if (newLevel > MAX_LEVEL) {
        setGameStatus('victory');
    } else {
        setGameStatus('evolving');
    }
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameStatus('gameover');
  }, []);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setExp(0);
    setParticleCount(20);
    setResetTrigger(prev => prev + 1);
    setGameStatus('playing');
  };

  const resumeGame = () => {
    setGameStatus('playing');
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans select-none">
      
      {/* Game Layer */}
      <GameCanvas 
        onScoreUpdate={handleScoreUpdate}
        onEvolutionStart={handleEvolutionStart}
        onGameOver={handleGameOver}
        gameActive={gameStatus === 'playing'}
        gameResetTrigger={resetTrigger}
      />

      {/* UI Layer */}
      {gameStatus === 'playing' && (
        <HUD 
          score={score} 
          level={level} 
          exp={exp} 
          maxExp={maxExp} 
          particleCount={particleCount}
        />
      )}

      {/* Screens */}
      {gameStatus === 'start' && (
        <Modal
          title="Ephemera"
          actionLabel="Begin Evolution"
          onAction={startGame}
          icon={<Play className="w-20 h-20 text-cyan-400 fill-cyan-400/20" />}
        >
          <div className="text-center space-y-4">
            <p>From a speck of dust to a cosmic leviathan.</p>
            <ul className="text-left text-sm space-y-2 bg-slate-800/50 p-4 rounded-lg">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Use your <strong>Mouse</strong> to guide your creature.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Absorb <span className="text-cyan-300">particles</span> to gain energy.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                <strong>Hold Left Click / Space</strong> to Boost Speed.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Avoid larger creatures. <strong>Hunt</strong> smaller ones.
              </li>
            </ul>
          </div>
        </Modal>
      )}

      {gameStatus === 'evolving' && (
        <EvolutionModal level={level} onContinue={resumeGame} />
      )}

      {gameStatus === 'gameover' && (
        <Modal
          title="Extinction"
          actionLabel="Try Again"
          onAction={startGame}
          icon={<Skull className="w-16 h-16 text-red-500" />}
        >
          <p className="text-lg mb-2">Your journey has ended prematurely.</p>
          <div className="text-3xl font-bold text-yellow-400 mb-2">{score.toLocaleString()}</div>
          <div className="text-sm text-slate-500">FINAL BIOMASS SCORE</div>
        </Modal>
      )}

      {gameStatus === 'victory' && (
        <Modal
          title="Apex Predator"
          actionLabel="Reincarnate"
          onAction={startGame}
          icon={<Crown className="w-16 h-16 text-yellow-400" />}
        >
          <p className="text-lg mb-4">You have reached the pinnacle of evolution. The cosmos bows before you.</p>
          <div className="text-4xl font-bold text-yellow-400 mb-2">{score.toLocaleString()}</div>
          <div className="text-sm text-slate-500">LEGENDARY SCORE</div>
        </Modal>
      )}
      
    </div>
  );
};

export default App;
