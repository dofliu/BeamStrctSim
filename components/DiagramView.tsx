import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SimulationParams, LoadDefinition, LoadType } from '../types';
import { calculateAnalyticalDiagrams, generateDetailedSteps } from '../utils/structuralAnalysis';

interface DiagramViewProps {
    params: SimulationParams;
    onChange: (newParams: SimulationParams) => void;
}

const DiagramView: React.FC<DiagramViewProps> = ({ params, onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedLoadType, setSelectedLoadType] = useState<LoadType>('P');
    
    // Temp State for inputs
    const [inputVal, setInputVal] = useState(10);
    const [inputX, setInputX] = useState(params.length / 2);
    const [inputX2, setInputX2] = useState(params.length);
    const [inputPeak, setInputPeak] = useState<'left'|'right'>('right');

    const analysisData = calculateAnalyticalDiagrams(params);
    const stepResults = generateDetailedSteps(params, analysisData.reactions);

    // Re-render MathJax when content changes
    useEffect(() => {
        if ((window as any).MathJax) {
            (window as any).MathJax.typesetPromise();
        }
    }, [stepResults]);

    const addLoad = () => {
        const newLoad: LoadDefinition = {
            id: Date.now().toString(),
            type: selectedLoadType,
            val: inputVal,
            x: inputX,
            x1: inputX,
            x2: inputX2,
            peak: inputPeak
        };
        
        // Ensure customLoads array exists
        const currentLoads = params.customLoads || [];
        
        onChange({
            ...params,
            customLoads: [...currentLoads, newLoad]
        });
    };

    const removeLoad = (id: string) => {
        const currentLoads = params.customLoads || [];
        onChange({
            ...params,
            customLoads: currentLoads.filter(l => l.id !== id)
        });
    };

    const clearLoads = () => {
        onChange({ ...params, customLoads: [] });
    };

    // Draw Canvas
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;
        
        const W = cvs.width; 
        const H = cvs.height;
        const pad = 50;
        const beamY = 60;
        
        // Clear
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fillRect(0,0,W,H);
        
        const L = params.length;
        const scaleX = (W - 2*pad) / L;
        const xToPx = (x: number) => pad + x * scaleX;

        // Draw Beam
        ctx.lineWidth = 4; ctx.strokeStyle = '#94a3b8'; 
        ctx.beginPath(); ctx.moveTo(xToPx(0), beamY); ctx.lineTo(xToPx(L), beamY); ctx.stroke();

        // Draw Supports
        const drawSup = (x: number, type: 'pin'|'roller'|'fixed') => {
             ctx.fillStyle = '#64748b';
             if (type === 'fixed') { ctx.fillRect(xToPx(x)-6, beamY-15, 6, 30); }
             else if (type === 'pin') { ctx.beginPath(); ctx.moveTo(xToPx(x), beamY); ctx.lineTo(xToPx(x)-8, beamY+15); ctx.lineTo(xToPx(x)+8, beamY+15); ctx.fill(); }
             else { ctx.strokeStyle='#64748b'; ctx.beginPath(); ctx.arc(xToPx(x), beamY+8, 6, 0, Math.PI*2); ctx.stroke(); }
        };

        if (params.beamType === 'cantilever') drawSup(0, 'fixed');
        else if (params.beamType === 'simplySupported') { drawSup(0, 'pin'); drawSup(L, 'roller'); }
        else { drawSup(params.supportA, 'pin'); drawSup(params.supportB, 'roller'); }

        // Draw Loads
        const loads = params.customLoads || [];
        loads.forEach(l => {
             ctx.fillStyle = '#f43f5e'; ctx.strokeStyle = '#f43f5e';
             if (l.type === 'P' && l.x !== undefined) {
                 const px = xToPx(l.x);
                 ctx.beginPath(); ctx.moveTo(px, beamY-40); ctx.lineTo(px, beamY); ctx.stroke();
                 ctx.beginPath(); ctx.moveTo(px, beamY); ctx.lineTo(px-4, beamY-8); ctx.lineTo(px+4, beamY-8); ctx.fill();
                 ctx.fillText(`${l.val}`, px, beamY-45);
             } else if (l.type === 'U' && l.x1 !== undefined && l.x2 !== undefined) {
                 const x1 = xToPx(l.x1); const w = (l.x2 - l.x1)*scaleX;
                 ctx.globalAlpha = 0.2; ctx.fillRect(x1, beamY-20, w, 20); ctx.globalAlpha = 1;
                 ctx.strokeRect(x1, beamY-20, w, 20);
             }
        });

        // Draw Diagrams
        const { Vs, Ms } = analysisData;
        const drawGraph = (data: number[], yOffset: number, color: string, label: string) => {
             const h = 80;
             const maxVal = Math.max(...data.map(Math.abs), 0.1);
             const sY = (h/2) / maxVal;
             
             // Base Line
             ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; 
             ctx.beginPath(); ctx.moveTo(pad, yOffset); ctx.lineTo(W-pad, yOffset); ctx.stroke();
             
             // Label
             ctx.fillStyle = color; ctx.font = "bold 14px monospace";
             ctx.fillText(label, pad, yOffset - h/2 - 5);

             // Graph
             ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fillStyle = color + '22';
             ctx.beginPath(); ctx.moveTo(pad, yOffset);
             data.forEach((v, i) => {
                 const x = pad + (i / (data.length-1)) * (W-2*pad);
                 ctx.lineTo(x, yOffset - v * sY);
             });
             ctx.lineTo(W-pad, yOffset);
             ctx.fill(); ctx.stroke();
        };

        const chartH = (H - 120) / 2;
        drawGraph(Vs, 120 + chartH/2, '#3b82f6', 'Shear Force V(x)');
        drawGraph(Ms, 120 + chartH + 20 + chartH/2, '#a855f7', 'Bending Moment M(x)');

    }, [params, analysisData]);

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-4 gap-4 overflow-hidden">
            
            {/* Top Toolbar: Load Manager */}
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-wrap items-center gap-4">
                <div className="flex bg-slate-700 rounded p-1">
                    {(['P','U','T','M'] as LoadType[]).map(t => (
                        <button 
                            key={t}
                            onClick={() => setSelectedLoadType(t)}
                            className={`px-3 py-1 text-sm font-bold rounded ${selectedLoadType === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 items-center text-sm">
                    <span>數值:</span>
                    <input type="number" value={inputVal} onChange={e => setInputVal(+e.target.value)} className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                </div>
                
                <div className="flex gap-2 items-center text-sm">
                    <span>位置 x:</span>
                    <input type="number" value={inputX} onChange={e => setInputX(+e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                    {(selectedLoadType === 'U' || selectedLoadType === 'T') && (
                        <>
                        <span>-</span>
                        <input type="number" value={inputX2} onChange={e => setInputX2(+e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                        </>
                    )}
                </div>

                <button onClick={addLoad} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-sm font-bold shadow-lg transition-all active:scale-95">
                    + 加入載重
                </button>
                <button onClick={clearLoads} className="text-red-400 hover:text-red-300 text-sm underline ml-auto">
                    清空列表
                </button>
            </div>

            {/* Middle: Canvas */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative shadow-inner">
                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={400} 
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Bottom: Analysis Steps */}
            <div className="h-64 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-sm font-bold text-slate-400 uppercase sticky top-0 bg-slate-900 py-2 border-b border-slate-800">區段數學分析報告 (Detailed Analysis)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {stepResults.map((step, idx) => (
                         <div key={idx} className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                             <div className="text-blue-400 text-xs font-mono font-bold mb-2">
                                 Segment {idx+1}: {step.xA.toFixed(2)}m &lt; x &lt; {step.xB.toFixed(2)}m
                             </div>
                             <div className="text-sm text-slate-300 leading-relaxed space-y-2">
                                 {/* Render HTML content safely */}
                                 <div dangerouslySetInnerHTML={{ __html: step.eq }} />
                             </div>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DiagramView;