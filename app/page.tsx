"use client";

import { useState, useEffect } from 'react';
import { Country, GameState, Mission } from './lib/types';
import { INITIAL_MISSIONS } from './lib/missions';
import { Play, Pause, Flag, ArrowLeft, Sword, Coins, Calendar, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const MissionWidget = ({ missions, onOpenTree, onComplete }: { missions: Mission[], onOpenTree: () => void, onComplete: (id: string) => void }) => {
  const availableMissions = missions.filter(m => m.unlocked && !m.completed).slice(0, 3);

  return (
    <div className="bg-stone-900/90 backdrop-blur border border-stone-700 rounded-lg shadow-xl w-72 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-stone-800 bg-stone-950/50 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase text-stone-400 tracking-widest">Active Missions</h3>
        <button 
          onClick={onOpenTree}
          className="text-xs text-yellow-500 hover:text-yellow-400 font-bold flex items-center gap-1"
        >
          View Tree <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      
      <div className="p-2 flex flex-col gap-2">
        {availableMissions.length === 0 ? (
           <div className="p-4 text-center text-xs text-stone-500 italic">
             No immediate missions available. Check the tree.
           </div>
        ) : (
          availableMissions.map(mission => (
            <button
              key={mission.id}
              onClick={() => onComplete(mission.id)}
              className="group relative flex flex-col gap-1 p-2 rounded bg-stone-800 border border-stone-700 hover:border-yellow-600/50 hover:bg-stone-750 transition-all text-left"
            >
               <div className="flex items-center justify-between w-full">
                 <span className="text-sm font-bold text-stone-200 group-hover:text-yellow-100">{mission.title}</span>
                 <span className="text-xs font-mono text-stone-500 group-hover:text-stone-300">
                    {mission.cost ? `-$${mission.cost}` : 'Free'}
                 </span>
               </div>
               <div className="text-[10px] text-stone-400 leading-tight">{mission.description}</div>
               
               {/* Rewards preview on hover */}
               <div className="text-[10px] flex gap-2 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  {mission.rewardMoney ? <span className="text-green-400">+${mission.rewardMoney}</span> : null}
                  {mission.rewardIncome ? <span className="text-green-400">+{mission.rewardIncome}/h</span> : null}
               </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const TitleScreen = ({ onStart }: { onStart: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-stone-100 font-serif space-y-8">
    <h1 className="text-6xl font-bold tracking-wider text-red-600 uppercase drop-shadow-md text-center">
      Russian Civil War<br/><span className="text-4xl text-stone-300">Simulator</span>
    </h1>
    <button 
      onClick={onStart}
      className="px-8 py-3 text-xl bg-stone-800 border-2 border-stone-600 hover:bg-stone-700 hover:border-red-500 transition-all rounded shadow-lg uppercase tracking-widest"
    >
      Begin Conflict
    </button>
  </div>
);

const CountrySelectScreen = ({ onSelect }: { onSelect: (c: Country) => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-stone-100 font-serif space-y-12">
    <h2 className="text-4xl font-bold uppercase tracking-widest">Select Your Faction</h2>
    <div className="flex flex-col md:flex-row gap-8">
      <button 
        onClick={() => onSelect('Soviet')}
        className="group relative w-64 h-80 bg-red-900/20 border-2 border-red-900 hover:bg-red-900/40 hover:border-red-600 transition-all rounded-lg flex flex-col items-center justify-center gap-4 overflow-hidden"
      >
        <div className="absolute inset-0 bg-red-600/5 group-hover:bg-red-600/10 transition-colors" />
        <Flag className="w-24 h-24 text-red-600" />
        <span className="text-2xl font-bold uppercase z-10">Red Army</span>
        <span className="text-sm text-red-300/60 text-center px-4 z-10">Revolutionary Workers & Peasants</span>
      </button>

      <button 
        onClick={() => onSelect('Republic')}
        className="group relative w-64 h-80 bg-blue-900/20 border-2 border-blue-900 hover:bg-blue-900/40 hover:border-blue-400 transition-all rounded-lg flex flex-col items-center justify-center gap-4 overflow-hidden"
      >
        <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
        <Flag className="w-24 h-24 text-blue-400" />
        <span className="text-2xl font-bold uppercase z-10">White Army</span>
        <span className="text-sm text-blue-300/60 text-center px-4 z-10">Defenders of the Republic</span>
      </button>
    </div>
  </div>
);

const MissionTreeItem = ({ mission, onComplete, allMissions }: { mission: Mission, onComplete: (id: string) => void, allMissions: Mission[] }) => {
  const isAvailable = mission.unlocked && !mission.completed;
  const isCompleted = mission.completed;
  const isLocked = !mission.unlocked;

  // Find children to render lines/structure
  const children = allMissions.filter(m => m.parentId === mission.id);

  return (
    <div className="flex flex-col items-center p-4">
      <button
        disabled={!isAvailable}
        onClick={() => isAvailable && onComplete(mission.id)}
        className={cn(
          "w-64 p-4 border-2 rounded shadow-md transition-all flex flex-col gap-2 relative z-10",
          isCompleted && "bg-green-900/30 border-green-600 text-green-100",
          isAvailable && "bg-stone-800 border-yellow-600 text-stone-100 hover:bg-stone-700 hover:scale-105 cursor-pointer shadow-yellow-900/20",
          isLocked && "bg-stone-900 border-stone-700 text-stone-500 opacity-70 cursor-not-allowed"
        )}
      >
        <div className="font-bold text-lg flex justify-between w-full">
          <span>{mission.title}</span>
          {isCompleted && <span className="text-green-500">✓</span>}
        </div>
        <div className="text-xs text-left">{mission.description}</div>
        
        {!isCompleted && !isLocked && (
          <div className="mt-2 pt-2 border-t border-white/10 w-full text-xs flex justify-between">
            <div className="text-red-400">Cost: ${mission.cost}</div>
            <div className="text-green-400">
               {mission.rewardMoney ? `+$${mission.rewardMoney} ` : ''}
               {mission.rewardIncome ? `+${mission.rewardIncome}/h` : ''}
            </div>
          </div>
        )}
      </button>

      {/* Basic recursive rendering for children */}
      {children.length > 0 && (
        <div className="flex flex-row gap-4 mt-8 pt-4 border-t-2 border-stone-600 relative">
          {/* Vertical connector from parent to the horizontal bar */}
          <div className="absolute -top-4 left-1/2 w-0.5 h-4 bg-stone-600 -translate-x-1/2"></div>
          
          {children.map(child => (
            <div key={child.id} className="relative pt-4"> 
               {/* Vertical connector from horizontal bar to child */}
               <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-stone-600 -translate-x-1/2"></div>
               <MissionTreeItem mission={child} onComplete={onComplete} allMissions={allMissions} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MissionsScreen = ({ missions, onBack, onCompleteMission }: { missions: Mission[], onBack: () => void, onCompleteMission: (id: string) => void }) => {
  const rootMissions = missions.filter(m => m.parentId === null);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans flex flex-col">
      <header className="h-16 bg-stone-950 border-b border-stone-800 flex items-center px-4 justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold uppercase tracking-wide">Strategic Focus</h2>
        </div>
      </header>
      
      <div className="flex-1 overflow-auto p-8">
        <div className="min-w-max flex justify-center">
           {rootMissions.map(root => (
             <MissionTreeItem key={root.id} mission={root} onComplete={onCompleteMission} allMissions={missions} />
           ))}
        </div>
      </div>
    </div>
  );
};


// --- Main Application Component ---

export default function Game() {
  const [state, setState] = useState<GameState>({
    screen: 'TITLE',
    country: null,
    date: new Date('1918-01-01T12:00:00'),
    isPlaying: false,
    gameSpeed: 1,
    money: 100,
    income: 5,
    infantryCount: 0,
    missions: INITIAL_MISSIONS,
  });

  // Game Loop
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (state.screen === 'MAIN' && state.isPlaying) {
      const msPerTick = 1000 / state.gameSpeed; // Basic speed scaling
      
      intervalId = setInterval(() => {
        setState(prev => {
          // Increment time by 1 hour
          const newDate = new Date(prev.date.getTime() + 60 * 60 * 1000);
          // Add income (simplified to per-hour tick for now)
          const newMoney = prev.money + prev.income;

          return {
            ...prev,
            date: newDate,
            money: newMoney,
          };
        });
      }, msPerTick);
    }

    return () => clearInterval(intervalId);
  }, [state.screen, state.isPlaying, state.gameSpeed]);


  // Actions
  const startGame = () => setState(prev => ({ ...prev, screen: 'COUNTRY_SELECT' }));
  
  const selectCountry = (country: Country) => {
    setState(prev => ({ 
      ...prev, 
      country, 
      screen: 'MAIN',
      // Reset some initial stats based on country potentially in future
    }));
  };

  const togglePause = () => setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  
  const changeSpeed = () => setState(prev => ({ ...prev, gameSpeed: (prev.gameSpeed % 3) + 1 }));

  const createInfantry = () => {
    const cost = 50;
    if (state.money >= cost) {
      setState(prev => ({
        ...prev,
        money: prev.money - cost,
        infantryCount: prev.infantryCount + 1,
      }));
    }
  };

  const openMissions = () => {
     // Pause game when opening menu
     setState(prev => ({ ...prev, screen: 'MISSIONS', isPlaying: false }));
  };

  const closeMissions = () => setState(prev => ({ ...prev, screen: 'MAIN' }));

  const completeMission = (missionId: string) => {
    setState(prev => {
      const missionIndex = prev.missions.findIndex(m => m.id === missionId);
      if (missionIndex === -1) return prev;

      const mission = prev.missions[missionIndex];
      
      // Validation
      if (!mission.unlocked || mission.completed || (mission.cost && prev.money < mission.cost)) {
        return prev;
      }

      // Apply costs and rewards
      const newMoney = prev.money - (mission.cost || 0) + (mission.rewardMoney || 0);
      const newIncome = prev.income + (mission.rewardIncome || 0);

      // Update mission status
      const newMissions = [...prev.missions];
      newMissions[missionIndex] = { ...mission, completed: true };

      // Unlock children
      prev.missions.forEach((m, idx) => {
        if (m.parentId === mission.id) {
           newMissions[idx] = { ...m, unlocked: true };
        }
      });

      return {
        ...prev,
        money: newMoney,
        income: newIncome,
        missions: newMissions
      };
    });
  };

  // Rendering
  if (state.screen === 'TITLE') return <TitleScreen onStart={startGame} />;
  if (state.screen === 'COUNTRY_SELECT') return <CountrySelectScreen onSelect={selectCountry} />;
  if (state.screen === 'MISSIONS') return <MissionsScreen missions={state.missions} onBack={closeMissions} onCompleteMission={completeMission} />;

  // Main Screen
  return (
    <div className="flex flex-col h-screen bg-stone-900 text-stone-100 font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-stone-950 border-b border-stone-800 flex items-center px-6 justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center border border-stone-600">
               <Flag className={cn("w-6 h-6", state.country === 'Soviet' ? "text-red-600" : "text-blue-400")} />
            </div>
            <div className="flex flex-col">
               <span className="font-bold uppercase tracking-wider text-sm text-stone-400">Nation</span>
               <span className="font-bold text-lg leading-none">{state.country === 'Soviet' ? 'Soviet Russia' : 'Russian Republic'}</span>
            </div>
          </div>
          
          <div className="h-8 w-[1px] bg-stone-700" />

          <div className="flex items-center gap-6 text-sm font-medium">
             <div className="flex items-center gap-2 text-yellow-500 tooltip" title="Treasury">
               <Coins className="w-5 h-5" />
               <div className="flex flex-col">
                 <span>${Math.floor(state.money)}</span>
                 <span className="text-xs text-stone-500">+${state.income}/h</span>
               </div>
             </div>
             
             <div className="flex items-center gap-2 text-stone-300">
               <Sword className="w-5 h-5" />
               <span>{state.infantryCount} Divisions</span>
             </div>
          </div>
        </div>

        {/* Time Control */}
        <div className="flex items-center gap-4 bg-stone-900 rounded-lg p-1 border border-stone-800">
           <div className="px-4 py-1 text-stone-300 font-mono text-sm border-r border-stone-800 flex items-center gap-2">
             <Calendar className="w-4 h-4 text-stone-500" />
             {state.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} 
             <span className="text-stone-500">|</span> 
             {state.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
           </div>
           
           <div className="flex gap-1">
             <button 
                onClick={changeSpeed} 
                className="p-2 hover:bg-stone-800 rounded transition-colors text-xs font-bold w-8 text-center"
                title="Change Speed"
             >
               {state.gameSpeed}x
             </button>
             <button 
                onClick={togglePause} 
                className={cn(
                  "p-2 rounded transition-colors",
                  state.isPlaying ? "bg-stone-800 text-stone-300 hover:bg-stone-700" : "bg-green-700 text-white hover:bg-green-600"
                )}
             >
               {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
             </button>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative bg-[#2a2a2a] overflow-hidden">
         {/* Map Background (Placeholder) */}
         <div className="absolute inset-0 opacity-20 pointer-events-none select-none overflow-hidden">
             {/* Simple visual pattern to represent map texture */}
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-600 via-stone-900 to-black" />
            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] text-stone-700" viewBox="0 0 100 100" fill="currentColor">
               <path d="M20,50 Q40,5 60,50 T90,50" stroke="currentColor" strokeWidth="0.5" fill="none" />
               <path d="M10,20 Q30,60 50,30 T80,80" stroke="currentColor" strokeWidth="0.5" fill="none" />
               {/* Rough shape hinting at Russia */}
               <path d="M10,30 L30,10 L70,10 L90,40 L80,80 L20,80 Z" fill="currentColor" opacity="0.1" />
            </svg>
         </div>
         
         {/* UI Overlays */}
         <div className="absolute top-6 right-6 flex flex-col gap-4">
             {/* Mission Alert */}
            <MissionWidget missions={state.missions} onOpenTree={openMissions} onComplete={completeMission} />
         </div>

         <div className="absolute bottom-6 left-6">
             <div className="bg-stone-900/90 backdrop-blur border border-stone-700 p-4 rounded-lg shadow-xl w-64">
               <h3 className="text-xs font-bold uppercase text-stone-500 mb-3 tracking-widest">Production</h3>
               <button 
                 onClick={createInfantry}
                 disabled={state.money < 50}
                 className="w-full flex items-center justify-between p-3 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-stone-600 transition-all group"
               >
                 <div className="flex items-center gap-3">
                    <Sword className="w-4 h-4 text-stone-400 group-hover:text-stone-200" />
                    <span className="text-sm font-medium">Infantry Div.</span>
                 </div>
                 <span className="text-xs font-bold text-yellow-500">$50</span>
               </button>
             </div>
         </div>

      </main>
    </div>
  );
}
