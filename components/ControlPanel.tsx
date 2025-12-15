import React from 'react';
import { SimulationParams, SimulationInstance, SimMode } from '../types';

interface ControlPanelProps {
    simulations: SimulationInstance[];
    activeId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    params: SimulationParams;
    onChange: (newParams: SimulationParams) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
    simulations, activeId, onSelect, onAdd, onRemove, params, onChange 
}) => {
    
    const handleChange = (key: keyof SimulationParams, value: any) => {
        let newParams = { ...params, [key]: value };
        // Basic validation for beam
        if (key === 'length' && params.loadPosition > value) {
            newParams.loadPosition = value;
        }
        onChange(newParams);
    };
    
    // Helper to update nested bearing params
    const handleBearingChange = (key: keyof SimulationParams['bearing'], value: number) => {
        onChange({
            ...params,
            bearing: {
                ...params.bearing,
                [key]: value
            }
        });
    };

    const applyMaterial = (type: 'steel' | 'aluminum' | 'wood') => {
        let E = 200e9;
        let Yield = 250e6;
        if (type === 'steel') { E = 200e9; Yield = 250e6; } 
        else if (type === 'aluminum') { E = 70e9; Yield = 95e6; } 
        else if (type === 'wood') { E = 11e9; Yield = 40e6; }
        
        onChange({ ...params, youngsModulus: E, yieldStrength: Yield });
    };

    return (
        <div className="bg-slate-900 border-r border-slate-800 w-80 flex-shrink-0 flex flex-col h-full overflow-y-auto p-4 z-30 shadow-xl scrollbar-thin scrollbar-thumb-slate-700">
            <h1 className="text-xl font-bold text-white mb-1 tracking-tight">StructSim<span className="text-blue-500">.io</span></h1>
            <p className="text-slate-400 text-xs mb-4">工程結構分析模擬</p>

            {/* Simulation Manager */}
            <div className="mb-6 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">比較案例 (Cases)</label>
                    <button 
                        onClick={onAdd}
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition-colors"
                    >
                        + 複製新增
                    </button>
                </div>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                    {simulations.map(sim => (
                        <div 
                            key={sim.id}
                            onClick={() => onSelect(sim.id)}
                            className={`flex justify-between items-center p-2 rounded cursor-pointer border text-xs transition-colors
                                ${sim.id === activeId ? 'bg-blue-900/30 border-blue-500/50 text-blue-200' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-750'}`}
                        >
                            <span>{sim.name}</span>
                            {simulations.length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemove(sim.id); }}
                                    className="text-slate-500 hover:text-red-400 ml-2 px-1"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* MODE SWITCHER */}
            <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">分析模式 (Mode)</label>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => handleChange('mode', 'beam')}
                        className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${params.mode === 'beam' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        樑結構 (Beam)
                    </button>
                    <button 
                        onClick={() => handleChange('mode', 'bearing')}
                        className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${params.mode === 'bearing' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        軸承 FEA (Bearing)
                    </button>
                </div>
            </div>

            <div className="space-y-6 opacity-100 transition-opacity duration-200">
                
                {/* --- BEARING CONTROLS --- */}
                {params.mode === 'bearing' && (
                    <>
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">軸承幾何 (Bearing Geometry)</h3>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-xs text-slate-300">外環半徑 R_out</label>
                                    <span className="text-xs font-mono text-slate-400">{params.bearing.outerRadius} mm</span>
                                </div>
                                <input type="range" min="30" max="150" step="1" value={params.bearing.outerRadius} onChange={(e) => handleBearingChange('outerRadius', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-xs text-slate-300">內環半徑 R_in</label>
                                    <span className="text-xs font-mono text-slate-400">{params.bearing.innerRadius} mm</span>
                                </div>
                                <input type="range" min="10" max={params.bearing.outerRadius - 10} step="1" value={params.bearing.innerRadius} onChange={(e) => handleBearingChange('innerRadius', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-xs text-slate-300">滾珠數量 Z</label>
                                    <span className="text-xs font-mono text-slate-400">{params.bearing.ballCount}</span>
                                </div>
                                <input type="range" min="4" max="30" step="1" value={params.bearing.ballCount} onChange={(e) => handleBearingChange('ballCount', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-800">
                             <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">負載設定 (Loads)</h3>
                             <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-xs text-slate-300">徑向負載 Fr</label>
                                    <span className="text-xs font-mono text-slate-400">{params.bearing.radialLoad} N</span>
                                </div>
                                <input type="range" min="0" max="50000" step="100" value={params.bearing.radialLoad} onChange={(e) => handleBearingChange('radialLoad', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
                            </div>
                        </div>
                    </>
                )}


                {/* --- BEAM CONTROLS (Only show if beam mode) --- */}
                {params.mode === 'beam' && (
                <>
                <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">邊界條件 (Boundary)</label>
                     <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => handleChange('beamType', 'cantilever')}
                            className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${params.beamType === 'cantilever' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                        >
                            懸臂樑
                        </button>
                        <button 
                            onClick={() => handleChange('beamType', 'simplySupported')}
                            className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${params.beamType === 'simplySupported' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                        >
                            簡支樑
                        </button>
                        <button 
                            onClick={() => handleChange('beamType', 'overhanging')}
                            className={`col-span-2 px-3 py-2 text-xs font-medium rounded border transition-colors ${params.beamType === 'overhanging' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                        >
                            伸出樑 (Overhanging)
                        </button>
                     </div>
                     
                     {/* Overhanging specific controls */}
                     {params.beamType === 'overhanging' && (
                         <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-800 p-2 rounded">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400">支撐 A</label>
                                <input type="number" step="0.5" value={params.supportA} onChange={(e) => handleChange('supportA', Number(e.target.value))} className="w-full bg-slate-700 rounded px-2 py-1 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400">支撐 B</label>
                                <input type="number" step="0.5" value={params.supportB} onChange={(e) => handleChange('supportB', Number(e.target.value))} className="w-full bg-slate-700 rounded px-2 py-1 text-xs" />
                            </div>
                         </div>
                     )}
                </div>

                 {/* Section Type Settings */}
                 <div className="space-y-2 pt-4 border-t border-slate-800">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">截面形狀 (Section)</label>
                     <div className="grid grid-cols-3 gap-1">
                        <button onClick={() => handleChange('sectionType', 'rectangular')} className={`py-2 text-[10px] rounded border transition-colors ${params.sectionType === 'rectangular' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>矩形 Rect</button>
                        <button onClick={() => handleChange('sectionType', 'circular')} className={`py-2 text-[10px] rounded border transition-colors ${params.sectionType === 'circular' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>圓形 Circ</button>
                        <button onClick={() => handleChange('sectionType', 'ibeam')} className={`py-2 text-[10px] rounded border transition-colors ${params.sectionType === 'ibeam' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>H型鋼</button>
                     </div>
                </div>

                {/* Force Control (Only for Simple Mode, Diagram Mode uses its own) */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">基礎負載 (Base Load)</label>
                         <span className="text-[10px] text-slate-600">*用於3D模式</span>
                    </div>
                    
                    <div className="space-y-1">
                         <div className="flex justify-between items-center">
                            <label className="text-xs text-slate-300">施加外力 F</label>
                            <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{params.force.toFixed(0)} N</span>
                        </div>
                        <input type="range" min="-100000" max="100000" step="1000" value={params.force} onChange={(e) => handleChange('force', Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                             <label className="text-xs text-slate-300">施力位置 x</label>
                             <span className="text-xs font-mono text-slate-400">{params.loadPosition.toFixed(2)} m</span>
                        </div>
                        <input type="range" min="0" max={params.length} step="0.1" value={params.loadPosition} onChange={(e) => handleChange('loadPosition', Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400" />
                    </div>
                </div>

                {/* Geometry Controls */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">幾何尺寸 (Geometry)</h3>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-xs text-slate-300">樑長度 L</label>
                            <span className="text-xs font-mono text-slate-400">{params.length.toFixed(2)} m</span>
                        </div>
                        <input type="range" min="1" max="20" step="0.1" value={params.length} onChange={(e) => handleChange('length', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-xs text-slate-300">{params.sectionType === 'circular' ? '直徑 D' : '高度 H'}</label>
                            <span className="text-xs font-mono text-slate-400">{params.height.toFixed(2)} m</span>
                        </div>
                        <input type="range" min="0.1" max="1.5" step="0.05" value={params.height} onChange={(e) => handleChange('height', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                    </div>

                    {params.sectionType === 'rectangular' && (
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-xs text-slate-300">寬度 B</label>
                                <span className="text-xs font-mono text-slate-400">{params.sectionWidth.toFixed(2)} m</span>
                            </div>
                            <input type="range" min="0.05" max="1.0" step="0.05" value={params.sectionWidth} onChange={(e) => handleChange('sectionWidth', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                        </div>
                    )}

                    {params.sectionType === 'ibeam' && (
                        <>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-xs text-slate-300">翼板寬度 (Flange Width)</label>
                                    <span className="text-xs font-mono text-slate-400">{params.flangeWidth.toFixed(2)} m</span>
                                </div>
                                <input type="range" min="0.1" max="1.0" step="0.05" value={params.flangeWidth} onChange={(e) => handleChange('flangeWidth', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-slate-400">翼板厚 tf</label>
                                    <input type="number" step="0.01" value={params.flangeThickness} onChange={(e) => handleChange('flangeThickness', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-slate-400">腹板厚 tw</label>
                                    <input type="number" step="0.01" value={params.webThickness} onChange={(e) => handleChange('webThickness', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">顯示設定 (Display)</label>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-yellow-500">變形放大倍率</label>
                            <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">{params.deformationScale.toFixed(0)}x</span>
                        </div>
                        <input type="range" min="1" max="500" step="10" value={params.deformationScale} onChange={(e) => handleChange('deformationScale', Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400" />
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">材料特性 (Material)</h3>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                        <button onClick={() => applyMaterial('steel')} className="bg-slate-800 text-[10px] text-slate-300 py-1 rounded hover:bg-slate-700 border border-slate-700">鋼 Steel</button>
                        <button onClick={() => applyMaterial('aluminum')} className="bg-slate-800 text-[10px] text-slate-300 py-1 rounded hover:bg-slate-700 border border-slate-700">鋁 Alum.</button>
                        <button onClick={() => applyMaterial('wood')} className="bg-slate-800 text-[10px] text-slate-300 py-1 rounded hover:bg-slate-700 border border-slate-700">木 Wood</button>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-xs text-slate-300">楊氏模數 E</label>
                            <span className="text-xs font-mono text-slate-400">{(params.youngsModulus / 1e9).toFixed(1)} GPa</span>
                        </div>
                        <input type="range" min="10000000000" max="250000000000" step="1000000000" value={params.youngsModulus} onChange={(e) => handleChange('youngsModulus', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-xs text-slate-300">降伏強度 σy</label>
                            <span className="text-xs font-mono text-slate-400">{(params.yieldStrength / 1e6).toFixed(0)} MPa</span>
                        </div>
                        <input type="range" min="10000000" max="500000000" step="5000000" value={params.yieldStrength} onChange={(e) => handleChange('yieldStrength', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
                    </div>
                </div>
                </>
                )}
            </div>
        </div>
    );
};

export default ControlPanel;