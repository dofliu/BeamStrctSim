import React, { useState } from 'react';
import ControlPanel from './components/ControlPanel';
import BeamVisualizer from './components/BeamVisualizer';
import RightPanel from './components/RightPanel';
import AIAssistant from './components/AIAssistant';
import DiagramView from './components/DiagramView'; 
import BearingVisualizer from './components/BearingVisualizer'; // New Component
import { SimulationParams, SimulationInstance } from './types';

// Default initial parameters
const defaultParams: SimulationParams = {
    length: 8, 
    height: 0.5,
    force: -50000,
    youngsModulus: 200e9,
    yieldStrength: 250e6,
    meshDensityX: 40,
    meshDensityY: 8,
    deformationScale: 50,
    beamType: 'simplySupported',
    loadPosition: 4,
    
    // New Params
    supportA: 1,
    supportB: 7,
    customLoads: [],

    sectionType: 'rectangular',
    sectionWidth: 0.2,
    flangeWidth: 0.3,
    flangeThickness: 0.02,
    webThickness: 0.015,
    
    // --- Bearing Defaults ---
    mode: 'beam',
    bearing: {
        outerRadius: 100,
        innerRadius: 60,
        ballCount: 12,
        radialLoad: 5000,
        rotationSpeed: 0,
        contactAngle: 0
    }
};

type AppMode = 'stress' | 'diagram';

const App: React.FC = () => {
    // Manage list of simulations
    const [simulations, setSimulations] = useState<SimulationInstance[]>([
        { id: '1', name: 'Design Case 1', params: { ...defaultParams } }
    ]);
    
    // Track which simulation is currently being edited
    const [activeId, setActiveId] = useState<string>('1');
    const [viewMode, setViewMode] = useState<AppMode>('stress'); // Mode toggle for Beam

    const activeSim = simulations.find(s => s.id === activeId) || simulations[0];

    // Update params for the active simulation
    const handleParamChange = (newParams: SimulationParams) => {
        setSimulations(prev => prev.map(sim => 
            sim.id === activeId ? { ...sim, params: newParams } : sim
        ));
    };

    // Add a new simulation (cloning the current one for easy comparison)
    const addSimulation = () => {
        const newId = Date.now().toString();
        const newName = `Case ${simulations.length + 1}`;
        setSimulations(prev => [
            ...prev, 
            { id: newId, name: newName, params: { ...activeSim.params } } // Clone current params
        ]);
        setActiveId(newId);
    };

    // Remove a simulation
    const removeSimulation = (id: string) => {
        if (simulations.length <= 1) return; // Prevent deleting the last one
        
        const newSims = simulations.filter(s => s.id !== id);
        setSimulations(newSims);
        
        if (activeId === id) {
            setActiveId(newSims[newSims.length - 1].id);
        }
    };

    const handleSelectSim = (id: string) => {
        setActiveId(id);
    };

    return (
        <div className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans relative">
            
            {/* COLUMN 1: Control Panel (Left) */}
            <ControlPanel 
                simulations={simulations}
                activeId={activeId}
                onSelect={handleSelectSim}
                onAdd={addSimulation}
                onRemove={removeSimulation}
                params={activeSim.params} 
                onChange={handleParamChange} 
            />

            {/* COLUMN 2: Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden border-r border-slate-800">
                
                {/* Navigation Tabs (Only visible in Beam mode, or we can make it contextual) */}
                {activeSim.params.mode === 'beam' && (
                <div className="h-12 bg-slate-950 border-b border-slate-800 flex items-center px-4 gap-4">
                    <button 
                        onClick={() => setViewMode('stress')}
                        className={`text-sm font-bold px-4 py-1.5 rounded-full transition-all 
                            ${viewMode === 'stress' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        3D 應力模擬 (FEA Stress)
                    </button>
                    <button 
                        onClick={() => setViewMode('diagram')}
                        className={`text-sm font-bold px-4 py-1.5 rounded-full transition-all 
                            ${viewMode === 'diagram' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        工程圖表分析 (V-M Diagrams)
                    </button>
                </div>
                )}
                
                {activeSim.params.mode === 'bearing' && (
                     <div className="h-12 bg-slate-950 border-b border-slate-800 flex items-center px-4">
                        <span className="text-emerald-500 font-bold text-sm uppercase tracking-wide">
                            軸承有限元素分析 (Bearing Contact Analysis)
                        </span>
                     </div>
                )}

                {/* Content View */}
                {activeSim.params.mode === 'bearing' ? (
                     <div className="flex-1 overflow-hidden">
                        <BearingVisualizer params={activeSim.params.bearing} />
                     </div>
                ) : (
                    // BEAM MODE
                    <>
                    {viewMode === 'stress' ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                            {simulations.map((sim) => (
                                // Only show Beam simulations if they are in beam mode (though currently we mix structure in state, visualizer decides)
                                // Since mode is per simulation, we just render normally if it matches
                                sim.params.mode === 'beam' && (
                                <div 
                                    key={sim.id} 
                                    className={`min-h-[350px] flex-1 relative border-b border-slate-800 transition-all duration-200 
                                        ${sim.id === activeId ? 'bg-slate-900/50' : 'bg-slate-950/30 opacity-60 hover:opacity-80'}`}
                                    onClick={() => handleSelectSim(sim.id)}
                                >
                                    {/* Visual Indicator of Activity */}
                                    {sim.id === activeId && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 z-20"></div>
                                    )}

                                    {/* Label Badge */}
                                    <div className={`absolute top-4 left-4 z-20 px-3 py-1 rounded text-xs font-bold shadow-lg flex items-center gap-2 pointer-events-none
                                         ${sim.id === activeId ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        {sim.name}
                                        {sim.id === activeId && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                                    </div>

                                    <BeamVisualizer 
                                        params={sim.params} 
                                        isActive={sim.id === activeId}
                                    />
                                </div>
                                )
                            ))}
                        </div>
                    ) : (
                        // Diagram View
                        <div className="flex-1 overflow-hidden">
                            <DiagramView 
                                params={activeSim.params} 
                                onChange={handleParamChange} 
                            />
                        </div>
                    )}
                    </>
                )}
            </div>

            {/* COLUMN 3: Right Panel - Context Aware */}
            {activeSim.params.mode === 'beam' && viewMode === 'stress' && <RightPanel simulation={activeSim} />}
            
            {/* AI Assistant - Floating Bubble */}
            <AIAssistant activeSim={activeSim} />
        </div>
    );
};

export default App;