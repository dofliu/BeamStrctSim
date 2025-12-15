import React from 'react';
import { SimulationParams } from '../types';
import * as d3 from 'd3';

interface CrossSectionVisualizerProps {
    params: SimulationParams;
    maxStress: number; // The stress at the extreme fiber
}

const CrossSectionVisualizer: React.FC<CrossSectionVisualizerProps> = ({ params, maxStress }) => {
    const width = 200;
    const height = 160;
    const centerX = width / 2;
    const centerY = height / 2;

    // Scale drawing to fit in box (approx 80% of view)
    const drawScale = (Math.min(width, height) * 0.7) / params.height;

    // Create stress gradient definition
    // Top is Tension (Red) or Compression (Blue) depending on sign
    // But since we use symmetric color scale in main view, let's match it.
    // maxStress passed here is usually absolute, but let's assume the top fiber has +stress or -stress.
    // For visualization, we just show the gradient from Top Fiber Stress to Bottom Fiber Stress.
    
    // Gradient ID
    const gradientId = "stress-gradient-section";
    
    // If we assume positive moment (force down on cantilever = negative M = tension top), wait...
    // Cantilever Force Down: Top is Tension (Red), Bottom is Compression (Blue).
    // Simply Supported Force Down: Top is Compression (Blue), Bottom is Tension (Red).
    // Let's determine Top Fiber Stress sign.
    
    let isTopTension = false;
    if (params.beamType === 'cantilever') {
        // Force Down (<0) -> Moment > 0 at wall? No, M = P(x-L). At x=0, M = P(-L). if P is -, M is +.
        // Stress = -My/I. at y = +h/2 (top).
        // If P is negative (down), M is positive at wall? 
        // Let's rely on the physics.ts logic: M = P*(x-a). If P<0, x<a, then (x-a) is neg. M is pos.
        // Stress = - (+M) * (+y) / I = Negative (Compression).
        // Wait, Cantilever tip load down -> Top is Tension.
        // My physics calc in previous file: M = P*(xOriginal - safeA). 
        // if P = -100, a = 5. x = 0. M = -100 * -5 = 500.
        // Stress = - (500) * (0.25) / I = Negative (Compression).
        // Standard convention: M is usually defined such that d^2v/dx^2 = M/EI.
        // Let's simplify: If P < 0 (Down), Top is Tension, Bottom Compression.
        // ACTUALLY: Cantilever down -> Top Tension.
        // Simple Beam down -> Top Compression.
        
        isTopTension = params.force < 0; 
    } else {
        // Simple Beam
        // Load down -> Smiley face -> Top Compression.
        isTopTension = params.force > 0;
    }

    const topColor = isTopTension ? "#ef4444" : "#3b82f6"; // Red or Blue
    const bottomColor = isTopTension ? "#3b82f6" : "#ef4444"; // Blue or Red
    
    // However, d3 interpolateTurbo is used in main view.
    // Let's use simple Red/Blue for clarity here or match turbo.
    // Let's stick to Red (Tension) / Blue (Compression) for clear engineering meaning.

    return (
        <div className="flex flex-col items-center p-2 bg-slate-800/50 rounded border border-slate-700 mt-2">
            <span className="text-[10px] text-slate-400 mb-1 w-full text-left font-bold uppercase">截面應力分佈 (Section Stress)</span>
            <div className="relative">
                <svg width={width} height={height}>
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={topColor} />
                            <stop offset="50%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor={bottomColor} />
                        </linearGradient>
                    </defs>

                    {/* Draw Grid Lines */}
                    <line x1={0} y1={centerY} x2={width} y2={centerY} stroke="#475569" strokeDasharray="4 2" />
                    <line x1={centerX} y1={0} x2={centerX} y2={height} stroke="#475569" strokeDasharray="4 2" />

                    {/* Draw Shape */}
                    <g transform={`translate(${centerX}, ${centerY})`}>
                        {params.sectionType === 'rectangular' && (
                            <rect 
                                x={-params.sectionWidth * drawScale / 2}
                                y={-params.height * drawScale / 2}
                                width={params.sectionWidth * drawScale}
                                height={params.height * drawScale}
                                fill={`url(#${gradientId})`}
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                            />
                        )}

                        {params.sectionType === 'circular' && (
                            <circle 
                                cx={0}
                                cy={0}
                                r={(params.height * drawScale) / 2}
                                fill={`url(#${gradientId})`}
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                            />
                        )}

                        {params.sectionType === 'ibeam' && (
                            <path 
                                d={`
                                    M ${-params.flangeWidth * drawScale / 2} ${-params.height * drawScale / 2}
                                    h ${params.flangeWidth * drawScale}
                                    v ${params.flangeThickness * drawScale}
                                    h ${-(params.flangeWidth - params.webThickness) * drawScale / 2}
                                    v ${(params.height - 2 * params.flangeThickness) * drawScale}
                                    h ${(params.flangeWidth - params.webThickness) * drawScale / 2}
                                    v ${params.flangeThickness * drawScale}
                                    h ${-params.flangeWidth * drawScale}
                                    v ${-params.flangeThickness * drawScale}
                                    h ${(params.flangeWidth - params.webThickness) * drawScale / 2}
                                    v ${-(params.height - 2 * params.flangeThickness) * drawScale}
                                    h ${-(params.flangeWidth - params.webThickness) * drawScale / 2}
                                    Z
                                `}
                                fill={`url(#${gradientId})`}
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                            />
                        )}
                    </g>
                    
                    {/* Draw Stress Diagram on the right side */}
                    <g transform={`translate(${width - 40}, ${centerY})`}>
                         <line x1={0} y1={-height/2 + 10} x2={0} y2={height/2 - 10} stroke="#64748b" />
                         <path 
                            d={`M 0 ${-params.height * drawScale / 2} L 30 0 L 0 ${params.height * drawScale / 2}`}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="2"
                         />
                         <text x={35} y={-params.height * drawScale / 2} fontSize="10" fill={topColor} textAnchor="end">σ_max</text>
                    </g>
                </svg>
            </div>
            
            {/* Dimensions Info */}
            <div className="grid grid-cols-2 gap-2 w-full mt-2 text-[10px] text-slate-400">
                <div>H: {params.height.toFixed(2)}m</div>
                {params.sectionType === 'rectangular' && <div>W: {params.sectionWidth.toFixed(2)}m</div>}
                {params.sectionType === 'ibeam' && <div>Flange: {params.flangeWidth.toFixed(2)}m</div>}
                {params.sectionType === 'circular' && <div>Dia: {params.height.toFixed(2)}m</div>}
            </div>
        </div>
    );
};

export default CrossSectionVisualizer;