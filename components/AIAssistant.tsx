import React, { useState, useRef, useEffect } from 'react';
import { SimulationInstance } from '../types';
import { calculateBeamPhysics, calculateBeamStats } from '../utils/physics';
import { GoogleGenAI } from "@google/genai";

interface AIAssistantProps {
    activeSim: SimulationInstance;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ activeSim }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: '你好！我是你的結構工程導師。我可以協助你分析目前的設計安全性、提供優化建議，或是解釋材料力學的原理。請隨時發問！' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    // Construct the context string based on current simulation
    const getSimulationContext = () => {
        const { params } = activeSim;
        // Calculate physics on the fly to get current results
        const elements = calculateBeamPhysics(params);
        const stats = calculateBeamStats(elements);
        const safetyFactor = params.yieldStrength / Math.max(1, stats.maxStress);
        const deflectionRatio = (params.length / Math.max(0.0001, stats.maxDeflection)); // L / delta

        return `
        目前模擬狀態 (Current Simulation Context):
        - 案例名稱: ${activeSim.name}
        - 樑類型: ${params.beamType === 'cantilever' ? '懸臂樑 (Cantilever)' : '簡支樑 (Simply Supported)'}
        - 截面形狀: ${params.sectionType}
        - 尺寸: 長度 L=${params.length}m, 高度 H=${params.height}m
        - 材料: Young's Modulus=${(params.youngsModulus/1e9).toFixed(1)}GPa, Yield Strength=${(params.yieldStrength/1e6).toFixed(0)}MPa
        - 負載: ${params.force}N 施加於位置 x=${params.loadPosition}m
        
        分析結果 (Analysis Results):
        - 最大應力 (Max Stress): ${(stats.maxStress/1e6).toFixed(2)} MPa
        - 安全係數 (F.O.S): ${safetyFactor.toFixed(2)} (目標建議 > 1.5)
        - 最大變位 (Max Deflection): ${(stats.maxDeflection*1000).toFixed(2)} mm
        - 變位比 (L/Δ): ${deflectionRatio.toFixed(0)} (一般建築建議 > 360)
        `;
    };

    const handleSend = async (overridePrompt?: string) => {
        const promptText = overridePrompt || input.trim();
        if (!promptText || isLoading) return;

        const context = getSimulationContext();
        
        // Add user message
        const newMessages = [...messages, { role: 'user', text: promptText } as Message];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstruction = `
            你是一位專業、友善且富有教育熱忱的結構工程教授。你的任務是輔助使用者學習材料力學與結構設計。
            
            規則：
            1. 根據提供給你的「目前模擬狀態」數據進行分析。
            2. 如果安全係數 (F.O.S) 小於 1.0，請用警告的語氣指出結構已破壞，並具體建議如何加強（例如增加高度、更換材料）。
            3. 如果安全係數過高（例如 > 5.0），建議使用者可以減少斷面以節省材料（最佳化設計）。
            4. 解釋原理時，請提及「慣性矩 (Moment of Inertia)」或「力臂」等物理概念，讓使用者學到知識。
            5. 請使用繁體中文回答，數學公式可適當使用。
            6. 回答請簡潔有力，重點清晰，不要長篇大論。
            `;

            const fullPrompt = `
            ${context}
            
            使用者問題: ${promptText}
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            setMessages([...newMessages, { role: 'model', text: response.text || "抱歉，我現在無法回答。" }]);

        } catch (error) {
            console.error("AI Error:", error);
            setMessages([...newMessages, { role: 'model', text: "發生錯誤，請檢查 API Key 或稍後再試。" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (action: string) => {
        if (action === 'analyze') {
            handleSend("請幫我分析目前的結構設計是否安全？有無優化空間？");
        } else if (action === 'explain') {
            handleSend("請解釋目前截面形狀對於承受應力的影響原理。");
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed right-6 bottom-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center
                    ${isOpen ? 'bg-slate-700 rotate-90' : 'bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse'}`}
            >
                {isOpen ? (
                    <span className="text-white text-xl font-bold">✕</span>
                ) : (
                    <span className="text-2xl">🤖</span>
                )}
            </button>

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 transform transition-transform duration-300 flex flex-col
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl">
                        🤖
                    </div>
                    <div>
                        <h2 className="text-white font-bold">AI 結構導師</h2>
                        <p className="text-xs text-slate-400">Powered by Gemini 2.5</p>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                                ${msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700 flex gap-2 items-center">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex gap-2 overflow-x-auto">
                    <button 
                        onClick={() => handleQuickAction('analyze')}
                        disabled={isLoading}
                        className="flex-shrink-0 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/50 text-indigo-300 text-xs rounded hover:bg-indigo-500/20 transition-colors"
                    >
                        🔍 分析安全性
                    </button>
                    <button 
                        onClick={() => handleQuickAction('explain')}
                        disabled={isLoading}
                        className="flex-shrink-0 px-3 py-1.5 bg-purple-500/10 border border-purple-500/50 text-purple-300 text-xs rounded hover:bg-purple-500/20 transition-colors"
                    >
                        📚 解釋原理
                    </button>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-900 border-t border-slate-700">
                    <div className="flex gap-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="輸入問題，例如：如何減少變位？"
                            className="flex-1 bg-slate-800 text-slate-200 text-sm rounded-lg border border-slate-700 p-3 focus:outline-none focus:border-blue-500 resize-none h-12 custom-scrollbar"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || !input.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-4 transition-colors flex items-center justify-center"
                        >
                            <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIAssistant;