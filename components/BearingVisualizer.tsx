import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { BearingParams } from '../types';
import { calculateBearingPhysics, generateBallMesh } from '../utils/bearingPhysics';

interface BearingVisualizerProps {
    params: BearingParams;
    isActive?: boolean;
}

const BearingVisualizer: React.FC<BearingVisualizerProps> = ({ params, isActive = true }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const elements = useMemo(() => calculateBearingPhysics(params), [params]);
    
    // Find global max stress for color scaling
    const globalMaxStress = useMemo(() => Math.max(...elements.map(e => e.maxStress), 10), [elements]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Scale to fit: Max dimension is Outer Radius * 2
        const fitScale = (Math.min(width, height) * 0.8) / (params.outerRadius * 2);

        const svg = d3.select(svgRef.current);
        svg.attr("width", width).attr("height", height);
        svg.selectAll("*").remove(); // Clear

        const cx = width / 2;
        const cy = height / 2;

        const g = svg.append("g")
            .attr("transform", `translate(${cx}, ${cy})`);

        // Color Scale (Turbo)
        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateTurbo)
            .domain([0, globalMaxStress * 1.1]); // slight buffer

        // 1. Draw Outer Race
        g.append("circle")
            .attr("r", params.outerRadius * fitScale)
            .attr("fill", "none")
            .attr("stroke", "#475569")
            .attr("stroke-width", 20 * fitScale) // Thick race
            .attr("opacity", 0.8);
            
        // 2. Draw Inner Race
        g.append("circle")
            .attr("r", params.innerRadius * fitScale)
            .attr("fill", "#1e293b")
            .attr("stroke", "#475569")
            .attr("stroke-width", 15 * fitScale)
            .attr("opacity", 0.8);
            
        // 3. Draw Rolling Elements (Balls)
        // We use a Voronoi-like or Mesh approach for the Balls to look like FEA
        elements.forEach(el => {
            const ballGroup = g.append("g");
            
            // Generate internal mesh points for "FEA Look"
            const meshPoints = generateBallMesh(el, 6);
            
            // Draw "mesh" using Voronoi or just simple circles for performance
            // Using small circles (particles) to simulate continuum
            const particleRadius = (el.radius * fitScale) / 6;
            
            ballGroup.selectAll("circle.node")
                .data(meshPoints)
                .enter()
                .append("circle")
                .attr("cx", d => d.x * fitScale)
                .attr("cy", d => -d.y * fitScale) // SVG Y is down
                .attr("r", particleRadius * 1.2)
                .attr("fill", d => colorScale(d.stress))
                .attr("opacity", 0.9);
                
            // Draw Ball Outline
            ballGroup.append("circle")
                .attr("cx", el.x * fitScale)
                .attr("cy", -el.y * fitScale)
                .attr("r", el.radius * fitScale)
                .attr("fill", "none")
                .attr("stroke", el.load > 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)")
                .attr("stroke-width", 1);
        });

        // 4. Draw Load Arrow (Assuming Downward load)
        const arrowLen = 60;
        const arrowY = -params.innerRadius * fitScale + 20; // Start inside inner race
        
        g.append("line")
            .attr("x1", 0)
            .attr("y1", arrowY)
            .attr("x2", 0)
            .attr("y2", arrowY + arrowLen)
            .attr("stroke", "#ef4444")
            .attr("stroke-width", 4)
            .attr("marker-end", "url(#arrowhead)");
            
        // Define Arrowhead
        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#ef4444");
            
        // 5. Legend
        if (isActive) {
            const legendW = 120;
            const legendH = 10;
            const lg = svg.append("g").attr("transform", `translate(${width - legendW - 20}, ${height - 40})`);
            
            const defs = svg.select("defs");
            const grad = defs.append("linearGradient").attr("id", "bearing-legend");
            for (let i=0; i<=10; i++) {
                grad.append("stop").attr("offset", `${i*10}%`).attr("stop-color", colorScale(i/10 * globalMaxStress));
            }
            
            lg.append("rect").attr("width", legendW).attr("height", legendH).attr("fill", "url(#bearing-legend)").attr("rx", 3);
            lg.append("text").attr("x", 0).attr("y", -5).attr("fill", "#ccc").attr("font-size", 10).text("0 MPa");
            lg.append("text").attr("x", legendW).attr("y", -5).attr("fill", "#ccc").attr("font-size", 10).attr("text-anchor", "end").text(`${globalMaxStress.toFixed(0)} MPa`);
            lg.append("text").attr("x", 0).attr("y", -20).attr("fill", "#fff").attr("font-size", 11).attr("font-weight", "bold").text("赫茲接觸應力 (Hertzian)");
        }

    }, [elements, params, isActive, globalMaxStress]);

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-950">
            <div className="absolute top-4 left-4 text-xs font-mono text-slate-500">
                Bearing Analysis | Stribeck Method
            </div>
            
            {/* Info Overlay */}
            <div className="absolute top-4 right-4 bg-slate-800/80 p-3 rounded border border-slate-700 text-xs text-slate-300">
                <div className="font-bold text-white mb-1">軸承參數 (Parameters)</div>
                <div>徑向負荷: {params.radialLoad} N</div>
                <div>滾珠數量: {params.ballCount}</div>
                <div className="mt-2 font-bold text-white">最大接觸應力</div>
                <div className="text-lg font-mono text-red-400">{globalMaxStress.toFixed(1)} MPa</div>
            </div>
            
            <div ref={containerRef} className="w-full h-full">
                <svg ref={svgRef} className="w-full h-full block"></svg>
            </div>
        </div>
    );
};

export default BearingVisualizer;