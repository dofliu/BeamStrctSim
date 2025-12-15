import React from 'react';
import { SimulationParams } from '../types';
import CrossSectionVisualizer from './CrossSectionVisualizer';

interface AnalysisOverlayProps {
    params: SimulationParams;
    maxStress: number;
    maxDeflection: number;
}

const AnalysisOverlay: React.FC<AnalysisOverlayProps> = ({ params, maxStress, maxDeflection }) => {
    
    // Calculate Safety Factor
    const safetyFactor = params.yieldStrength / Math.max(1, Math.abs(maxStress));
    
    // Reaction Calculation (Approximate based on equilibrium)
    let R1 = 0, R2 = 0, M1 = 0;
    
    if (params.beamType === 'cantilever') {
        R1 = Math.abs(params.force); // Vertical reaction at wall
        M1 = Math.abs(params.force * params.loadPosition); // Moment at wall
    } else {
        // Simple Support
        const L = params.length;
        const a = params.loadPosition;
        const b = L - a;
        R1 = Math.abs(params.force * b / L); // Left support
        R2 = Math.abs(params.force * a / L); // Right support
    }

    // Status Color for Safety Factor
    const getSafetyColor = (sf: number) => {
        if (sf < 1.0) return 'text-red-500';
        if (sf < 1.5) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    return (
        <div className="absolute top-4 right-4 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-4 text-slate-200 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-slate-400 border-b border-slate-700 pb-2 mb-3 uppercase tracking-wider">
                結構分析結果 (Results)
            </h3>

            <div className="space-y-4">
                {/* Stress & Safety */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-400">最大應力 (Max Stress)</span>
                        <span className="text-sm font-mono font-medium">{(maxStress / 1e6).toFixed(1)} MPa</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${maxStress > params.yieldStrength ? 'bg-red-500' : 'bg-blue-500'}`} 
                            style={{width: `${Math.min(100, (maxStress / params.yieldStrength) * 100)}%`}}
                        ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-500">安全係數 (F.O.S.)</span>
                        <span className={`text-base font-bold font-mono ${getSafetyColor(safetyFactor)}`}>
                            {safetyFactor > 10 ? '>10' : safetyFactor.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Deflection */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/50">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500">最大變位 (Max Deflection)</span>
                        <span className="text-sm font-mono text-yellow-400">
                            {(maxDeflection * 1000).toFixed(2)} mm
                        </span>
                    </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500">允許變位 (L/360)</span>
                        <span className="text-sm font-mono text-slate-400">
                            {(params.length * 1000 / 360).toFixed(2)} mm
                        </span>
                    </div>
                </div>

                {/* Reactions */}
                <div className="pt-2 border-t border-slate-800/50">
                    <span className="text-[10px] text-slate-500 block mb-1">支承反力 (Reactions)</span>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-400">R_left:</span>
                            <span className="font-mono">{R1.toFixed(0)} N</span>
                        </div>
                        {params.beamType === 'simplySupported' && (
                            <div className="flex justify-between">
                                <span className="text-slate-400">R_right:</span>
                                <span className="font-mono">{R2.toFixed(0)} N</span>
                            </div>
                        )}
                        {params.beamType === 'cantilever' && (
                             <div className="flex justify-between col-span-2">
                                <span className="text-slate-400">M_wall:</span>
                                <span className="font-mono">{(M1 / 1000).toFixed(1)} kN·m</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Cross Section Analysis */}
                <div className="pt-2 border-t border-slate-800/50">
                    <CrossSectionVisualizer params={params} maxStress={maxStress} />
                </div>
            </div>
        </div>
    );
};

export default AnalysisOverlay;