import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { SimulationParams } from '../types';
import { calculateBeamPhysics, calculateBeamStats } from '../utils/physics';

interface BeamVisualizerProps {
    params: SimulationParams;
    isActive?: boolean;
}

const BeamVisualizer: React.FC<BeamVisualizerProps> = ({ params, isActive = true }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate physics model
    const elements = useMemo(() => calculateBeamPhysics(params), [params]);

    // Calculate Stats for Color Scale
    const stats = useMemo(() => calculateBeamStats(elements), [elements]);

    // Calculate Stress Range for Color Scale
    const { minStress, maxStress } = useMemo(() => {
        const absMax = Math.max(stats.maxStress, 100); 
        return { minStress: -absMax, maxStress: absMax };
    }, [stats]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const margin = { top: 40, right: 40, bottom: 40, left: 40 }; 

        const svg = d3.select(svgRef.current);
        svg.attr("width", width).attr("height", height);

        // Clear previous render
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${height / 2})`);

        // Scales
        const scaleFactor = (width - margin.left - margin.right) / (params.length * 1.1);
        
        // Color Scale
        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateTurbo) 
            .domain([minStress, maxStress]);

        // --- Draw Mesh ---
        g.selectAll("path.mesh")
            .data(elements)
            .enter()
            .append("path")
            .attr("class", "mesh")
            .attr("d", d => {
                const line = d3.line<any>()
                    .x(p => p.dx * scaleFactor)
                    .y(p => -p.dy * scaleFactor); // Invert Y
                const points = [...d.nodes, d.nodes[0]];
                return line(points);
            })
            .attr("fill", d => colorScale(d.avgStress))
            .attr("stroke", isActive ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.05)")
            .attr("stroke-width", 0.5);

        // --- Draw Supports ---
        if (params.beamType === 'cantilever') {
            // Wall on Left
            g.append("rect")
                .attr("x", -10)
                .attr("y", (-params.height / 2 * scaleFactor) - 10)
                .attr("width", 10)
                .attr("height", (params.height * scaleFactor) + 20)
                .attr("fill", "#cbd5e1")
                .attr("rx", 2);
            
            // Hatch
            const defs = svg.append("defs");
            const pattern = defs.append("pattern")
                .attr("id", "hatch")
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", 4)
                .attr("height", 4);
            pattern.append("path")
                .attr("d", "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2")
                .attr("stroke", "#94a3b8")
                .attr("stroke-width", 1);
            
            g.append("rect")
                 .attr("x", -20)
                 .attr("y", (-params.height / 2 * scaleFactor) - 20)
                 .attr("width", 20)
                 .attr("height", (params.height * scaleFactor) + 40)
                 .attr("fill", "url(#hatch)");
        } else {
            // Simply Supported
            const supportSize = 15;
            const yBase = (params.height / 2 * scaleFactor) + 2; 
            
            // Left Pin
            g.append("path")
                .attr("d", d3.line()([
                    [0, yBase], 
                    [-supportSize/2, yBase + supportSize], 
                    [supportSize/2, yBase + supportSize]
                ]))
                .attr("fill", "#cbd5e1")
                .attr("stroke", "#94a3b8");

            // Right Roller
            const xRight = params.length * scaleFactor;
            g.append("circle")
                .attr("cx", xRight)
                .attr("cy", yBase + supportSize/2)
                .attr("r", supportSize/2)
                .attr("fill", "#cbd5e1")
                .attr("stroke", "#94a3b8");
            
            g.append("line")
                .attr("x1", -20)
                .attr("y1", yBase + supportSize + 2)
                .attr("x2", xRight + 20)
                .attr("y2", yBase + supportSize + 2)
                .attr("stroke", "#64748b")
                .attr("stroke-width", 2);
        }

        // --- Draw Force Arrow & Label ---
        const calcDisplacement = (x: number) => {
             const targetX = x;
             let minDist = Infinity;
             let nearestNode = elements[0].nodes[2]; 
             elements.forEach(el => {
                [el.nodes[2], el.nodes[3]].forEach(n => {
                    const dist = Math.abs(n.x - targetX);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestNode = n;
                    }
                });
             });
             return { dx: nearestNode.dx, dy: nearestNode.dy };
        };

        const loadNode = calcDisplacement(params.loadPosition);
        const arrowX = loadNode.dx * scaleFactor;
        const arrowY = -loadNode.dy * scaleFactor; 
        
        const arrowLength = 40;
        const isDown = params.force < 0;
        const arrowColor = isActive ? "#ef4444" : "#9ca3af"; 

        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 5)
            .attr("markerHeight", 5)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", arrowColor);

        const forceGroup = g.append("g");
        
        let startX = arrowX;
        let startY = arrowY - (isDown ? arrowLength : -arrowLength);
        let endX = arrowX;
        let endY = arrowY - (isDown ? 10 : -10);

        forceGroup.append("line")
            .attr("x1", startX)
            .attr("y1", startY)
            .attr("x2", endX)
            .attr("y2", endY)
            .attr("stroke", arrowColor)
            .attr("stroke-width", isActive ? 2 : 1)
            .attr("marker-end", "url(#arrowhead)");

        const labelY = startY - (isDown ? 10 : -15);
        
        if (isActive) {
            forceGroup.append("text")
                .attr("x", startX)
                .attr("y", labelY)
                .attr("text-anchor", "middle")
                .attr("fill", arrowColor)
                .attr("font-weight", "bold")
                .attr("font-size", "12px")
                .text(`F = ${Math.abs(params.force)} N`);
        }

        // --- Draw Legend (Simplified) ---
        const legendWidth = 150;
        const legendHeight = 8;
        const legendX = (width - legendWidth) / 2 - margin.left;
        const legendY = height / 2 - margin.bottom + 10;

        const legendGradient = svg.select("defs").append("linearGradient")
            .attr("id", "legend-gradient");
        
        const ticks = 10;
        for (let i = 0; i <= ticks; i++) {
            const t = i / ticks;
            const val = minStress + t * (maxStress - minStress);
            legendGradient.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", colorScale(val));
        }

        const legendGroup = g.append("g")
            .attr("transform", `translate(${legendX}, ${legendY})`);

        legendGroup.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)")
            .attr("rx", 4);

        if (isActive) {
             const formatStress = (v: number) => {
                if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)}M`;
                return `${(v/1e3).toFixed(0)}k`;
            };

            legendGroup.append("text")
                .attr("x", -5)
                .attr("y", legendHeight/2 + 3)
                .attr("text-anchor", "end")
                .attr("fill", "#94a3b8")
                .attr("font-size", "10px")
                .text(formatStress(minStress));

            legendGroup.append("text")
                .attr("x", legendWidth + 5)
                .attr("y", legendHeight/2 + 3)
                .attr("text-anchor", "start")
                .attr("fill", "#94a3b8")
                .attr("font-size", "10px")
                .text(formatStress(maxStress));
        }

    }, [elements, params, maxStress, minStress, isActive]);

    return (
        <div className="w-full h-full relative flex flex-col cursor-pointer group">
             {/* Simple Title in corner */}
             <div className="absolute top-2 left-4 z-10 text-xs font-mono text-slate-500 pointer-events-none">
                {params.beamType === 'cantilever' ? 'Cantilever' : 'Simply Supported'} / {params.sectionType.toUpperCase()}
             </div>

            <div className="flex-1 w-full h-full relative" ref={containerRef}>
                <svg ref={svgRef} className="block w-full h-full z-10"></svg>
            </div>
        </div>
    );
};

export default BeamVisualizer;