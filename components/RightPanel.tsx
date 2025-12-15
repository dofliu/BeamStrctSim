import React from 'react';
import { SimulationInstance } from '../types';
import CrossSectionVisualizer from './CrossSectionVisualizer';
import FormulaCard from './FormulaCard';
import { calculateBeamPhysics, calculateBeamStats } from '../utils/physics';

interface RightPanelProps {
    simulation: SimulationInstance;
}

const RightPanel: React.FC<RightPanelProps> = ({ simulation }) => {
    const { params } = simulation;
    
    // Calculate results on the fly
    const elements = calculateBeamPhysics(params);
    const { maxStress, maxDeflection } = calculateBeamStats(elements);
    
    // Calculate Safety Factor
    const safetyFactor = params.yieldStrength / Math.max(1, Math.abs(maxStress));
    
    // Reaction Calculation
    let R1 = 0, R2 = 0, M1 = 0;
    if (params.beamType === 'cantilever') {
        R1 = Math.abs(params.force);
        M1 = Math.abs(params.force * params.loadPosition);
    } else {
        const L = params.length;
        const a = params.loadPosition;
        const b = L - a;
        R1 = Math.abs(params.force * b / L);
        R2 = Math.abs(params.force * a / L);
    }

    const getSafetyColor = (sf: number) => {
        if (sf < 1.0) return 'text-red-500';
        if (sf < 1.5) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    return (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 z-20 shadow-xl">
             <div className="mb-4 pb-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {simulation.name} 分析報告
                </h2>
                <p className="text-xs text-slate-500 ml-4 mt-1">即時計算結果</p>
            </div>

            <div className="space-y-6">
                {/* 1. Key Results */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">結構數據 (Results)</h3>
                    
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-3">
                         {/* Stress */}
                         <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs text-slate-400">最大應力</span>
                                <span className="text-sm font-mono font-medium text-white">{(maxStress / 1e6).toFixed(1)} MPa</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${maxStress > params.yieldStrength ? 'bg-red-500' : 'bg-blue-500'}`} 
                                    style={{width: `${Math.min(100, (maxStress / params.yieldStrength) * 100)}%`}}
                                ></div>
                            </div>
                         </div>

                         {/* Safety Factor */}
                         <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">安全係數 (F.O.S)</span>
                            <span className={`text-lg font-bold font-mono ${getSafetyColor(safetyFactor)}`}>
                                {safetyFactor > 10 ? '>10' : safetyFactor.toFixed(2)}
                            </span>
                        </div>

                        {/* Deflection */}
                        <div className="pt-2 border-t border-slate-700 grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[10px] text-slate-500 block">最大變位</span>
                                <span className="text-sm font-mono text-yellow-400">{(maxDeflection * 1000).toFixed(2)} mm</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 block">允許變位 (L/360)</span>
                                <span className="text-xs font-mono text-slate-400">{(params.length * 1000 / 360).toFixed(1)} mm</span>
                            </div>
                        </div>

                         {/* Reactions */}
                         <div className="pt-2 border-t border-slate-700">
                            <span className="text-[10px] text-slate-500 block mb-1">支承反力</span>
                            <div className="space-y-1 text-xs font-mono text-slate-300">
                                <div className="flex justify-between"><span>R_left</span><span>{R1.toFixed(0)} N</span></div>
                                {params.beamType === 'simplySupported' && (
                                    <div className="flex justify-between"><span>R_right</span><span>{R2.toFixed(0)} N</span></div>
                                )}
                                {params.beamType === 'cantilever' && (
                                    <div className="flex justify-between"><span>M_wall</span><span>{(M1 / 1000).toFixed(1)} kN·m</span></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Cross Section Visualizer */}
                <div>
                     <CrossSectionVisualizer params={params} maxStress={maxStress} />
                </div>

                {/* 3. Formulas */}
                <FormulaCard params={params} />

            </div>
            
            {/* Bottom Padding for scrolling */}
            <div className="h-10"></div>
        </div>
    );
};

export default RightPanel;