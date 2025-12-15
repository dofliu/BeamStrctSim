import React from 'react';
import { SimulationParams } from '../types';

interface FormulaCardProps {
    params: SimulationParams;
}

const FormulaCard: React.FC<FormulaCardProps> = ({ params }) => {
    
    // Helper to render fractions nicely
    const Fraction = ({ num, den }: { num: React.ReactNode, den: React.ReactNode }) => (
        <span className="inline-block align-middle text-center mx-1">
            <span className="block border-b border-slate-400 pb-[1px] mb-[1px]">{num}</span>
            <span className="block">{den}</span>
        </span>
    );

    return (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 pb-2">
                力學原理 (Mechanics)
            </h3>

            {/* Bending Stress Formula */}
            <div className="text-sm text-slate-300">
                <div className="mb-1 text-xs text-indigo-400 font-semibold">彎曲應力 (Bending Stress)</div>
                <div className="bg-slate-900/50 p-2 rounded flex items-center justify-center font-serif text-lg">
                    <span>&sigma; = -</span>
                    <Fraction num={<span>M &middot; y</span>} den="I" />
                </div>
                <div className="text-[10px] text-slate-500 mt-1 grid grid-cols-2 gap-1">
                    <span>M: 彎矩 (Moment)</span>
                    <span>y: 距中性軸距離</span>
                    <span>I: 慣性矩 (Inertia)</span>
                </div>
            </div>

            {/* Moment of Inertia Formula */}
            <div className="text-sm text-slate-300 pt-2 border-t border-slate-800">
                <div className="mb-1 text-xs text-teal-400 font-semibold">截面慣性矩 (Moment of Inertia)</div>
                <div className="bg-slate-900/50 p-2 rounded flex items-center justify-center font-serif text-lg">
                    {params.sectionType === 'rectangular' && (
                        <>
                            <span>I = </span>
                            <Fraction num={<span>b &middot; h<sup>3</sup></span>} den="12" />
                        </>
                    )}
                    {params.sectionType === 'circular' && (
                        <>
                            <span>I = </span>
                            <Fraction num={<span>&pi; &middot; d<sup>4</sup></span>} den="64" />
                        </>
                    )}
                    {params.sectionType === 'ibeam' && (
                        <span className="text-sm">
                            I = <Fraction num={<span>BH<sup>3</sup> - bh<sup>3</sup></span>} den="12" />
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 text-center">
                    {params.sectionType === 'rectangular' && "b=寬度, h=高度"}
                    {params.sectionType === 'circular' && "d=直徑"}
                    {params.sectionType === 'ibeam' && "大矩形減去內部空心區域"}
                </div>
            </div>

            {/* Deflection Formula (Simplified approximation display) */}
            <div className="text-sm text-slate-300 pt-2 border-t border-slate-800">
                <div className="mb-1 text-xs text-yellow-400 font-semibold">最大變位 (Max Deflection)</div>
                <div className="bg-slate-900/50 p-2 rounded flex items-center justify-center font-serif text-lg">
                    {params.beamType === 'cantilever' ? (
                        <>
                            <span>&delta;<sub>max</sub> = </span>
                            <Fraction num={<span>P &middot; L<sup>3</sup></span>} den={<span>3 &middot; E &middot; I</span>} />
                        </>
                    ) : (
                        <>
                             <span>&delta;<sub>max</sub> = </span>
                             <Fraction num={<span>P &middot; L<sup>3</sup></span>} den={<span>48 &middot; E &middot; I</span>} />
                        </>
                    )}
                </div>
                 <div className="text-[10px] text-slate-500 mt-1 text-center">
                    (當負載位於特定點時的近似公式)
                </div>
            </div>
        </div>
    );
};

export default FormulaCard;