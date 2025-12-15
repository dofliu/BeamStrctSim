import { SimulationParams, LoadDefinition } from '../types';

export interface DiagramData {
    xs: number[];
    Vs: number[];
    Ms: number[];
    reactions: { Ra: number; Rb: number; Ma: number };
}

export interface StepResult {
    eq: string;
    int: string;
    xA: number;
    xB: number;
}

const checkStep = (x: number, target: number, dx: number) => x >= target && x < target + dx;

export const calculateAnalyticalDiagrams = (params: SimulationParams): DiagramData => {
    const { length: L, beamType, customLoads } = params;
    
    // Handle Supports
    let supA = 0; 
    let supB = L;
    
    if (beamType === 'cantilever') {
        supA = 0; supB = 0;
    } else if (beamType === 'overhanging') {
        supA = params.supportA;
        supB = params.supportB;
    }

    // 1. Calculate Reactions
    let sumFy = 0;
    let sumMa = 0; // Moment about point A (or support A)
    
    // If no custom loads, use the basic one from params
    const loads = (customLoads && customLoads.length > 0) ? customLoads : [
        { id: 'default', type: 'P', val: Math.abs(params.force), x: params.loadPosition } as LoadDefinition
    ];

    loads.forEach(l => {
        if(l.type === 'P' && l.x !== undefined) { 
            sumFy -= l.val; 
            sumMa -= l.val * (l.x - supA); 
        }
        else if (l.type === 'M') { 
            sumMa += l.val; 
        }
        else if (l.type === 'U' && l.x1 !== undefined && l.x2 !== undefined) {
            let f = l.val * (l.x2 - l.x1);
            sumFy -= f; 
            sumMa -= f * ((l.x1 + l.x2)/2 - supA);
        } else if (l.type === 'T' && l.x1 !== undefined && l.x2 !== undefined) {
            let f = 0.5 * l.val * (l.x2 - l.x1);
            let d = (l.peak === 'right') ? (2/3)*(l.x2-l.x1) : (1/3)*(l.x2-l.x1);
            sumFy -= f; 
            sumMa -= f * (l.x1 + d - supA);
        }
    });

    const reactions = { Ra: 0, Rb: 0, Ma: 0 };

    if(beamType === 'cantilever') {
        // Fix at left (x=0)
        reactions.Ra = -sumFy; 
        reactions.Ma = -sumMa; // Reaction moment at wall
        reactions.Rb = 0;
    } else {
        let span = supB - supA; 
        if(Math.abs(span) < 1e-6) span = 1;
        reactions.Rb = -sumMa / span; 
        reactions.Ra = -sumFy - reactions.Rb; 
        reactions.Ma = 0;
    }

    // 2. Calculate Diagrams (V and M arrays)
    const n = 400;
    const dx = L / n;
    const xs: number[] = [];
    const Vs: number[] = [];
    const Ms: number[] = [];
    
    let V = 0;
    let M = 0;

    for(let i = 0; i <= n; i++) {
        let x = i * dx;
        
        // Add reactions to shear
        if (beamType !== 'cantilever') {
            if(checkStep(x, supA, dx)) V += reactions.Ra;
            if(checkStep(x, supB, dx)) V += reactions.Rb;
        } else if(checkStep(x, 0, dx)) {
            V += reactions.Ra;
        }
        
        // Point Loads Shear
        loads.forEach(l => { 
            if(l.type === 'P' && l.x !== undefined && checkStep(x, l.x, dx)) V -= l.val; 
        });
        
        // Distributed Loads Shear Integration
        let q = 0;
        loads.forEach(l => {
            if(l.x1 !== undefined && l.x2 !== undefined && x >= l.x1 && x <= l.x2) {
                if(l.type === 'U') q += l.val;
                if(l.type === 'T') { 
                    let r = (x - l.x1)/(l.x2 - l.x1); 
                    q += (l.peak === 'right' ? r : (1-r)) * l.val; 
                }
            }
        });
        V -= q * dx;
        
        // Moment Integration
        M += V * dx;
        
        // Reaction Moment (Cantilever)
        if(beamType === 'cantilever' && checkStep(x, 0, dx)) M += -reactions.Ma;
        
        // Point Moments
        loads.forEach(l => { 
            if(l.type === 'M' && l.x !== undefined && checkStep(x, l.x, dx)) M -= l.val; 
        });
        
        xs.push(x);
        Vs.push(V);
        Ms.push(M);
    }

    return { xs, Vs, Ms, reactions };
};

// --- Polynomial Solver for Detailed Analysis ---

interface PolyCoeffs {
    m3: number; m2: number; m1: number; m0: number;
    v2: number; v1: number; v0: number;
}

const getPolynomial = (xA: number, xB: number, params: SimulationParams, reactions: {Ra:number, Rb:number, Ma:number}): PolyCoeffs => {
    let c: PolyCoeffs = { m3:0, m2:0, m1:0, m0:0, v2:0, v1:0, v0:0 };
    const { beamType, supportA, supportB, customLoads } = params;
    const supA = beamType === 'overhanging' ? supportA : 0;
    const supB = beamType === 'overhanging' ? supportB : params.length;
    
    const loads = (customLoads && customLoads.length > 0) ? customLoads : [
         { id: 'default', type: 'P', val: Math.abs(params.force), x: params.loadPosition } as LoadDefinition
    ];

    // Reactions contributions
    if (beamType === 'cantilever') { 
        c.v0 += reactions.Ra; 
        c.m1 += reactions.Ra; 
        c.m0 -= reactions.Ma; 
    } else {
        if (supA <= xA) { 
            c.v0 += reactions.Ra; 
            c.m1 += reactions.Ra; 
            c.m0 -= reactions.Ra * supA; 
        }
        if (supB <= xA) { 
            c.v0 += reactions.Rb; 
            c.m1 += reactions.Rb; 
            c.m0 -= reactions.Rb * supB; 
        }
    }

    // Loads contributions
    loads.forEach(l => {
        if (l.type === 'P' && l.x !== undefined && l.x <= xA) { 
            c.v0 -= l.val; 
            c.m1 -= l.val; 
            c.m0 += l.val * l.x; 
        }
        else if (l.type === 'M' && l.x !== undefined && l.x <= xA) { 
            c.m0 -= l.val; 
        }
        else if (l.type === 'U' && l.x1 !== undefined && l.x2 !== undefined) {
            if (l.x2 <= xA) { 
                let F = l.val * (l.x2 - l.x1); 
                let cent = (l.x1 + l.x2) / 2; 
                c.v0 -= F; 
                c.m1 -= F; 
                c.m0 += F * cent; 
            } 
            else if (l.x1 <= xA && l.x2 >= xB) { 
                c.v1 -= l.val; 
                c.v0 += l.val * l.x1; 
                c.m2 -= 0.5 * l.val; 
                c.m1 += l.val * l.x1; 
                c.m0 -= 0.5 * l.val * l.x1 * l.x1; 
            }
        } 
        else if (l.type === 'T' && l.x1 !== undefined && l.x2 !== undefined) {
            if (l.x2 <= xA) {
                let F = 0.5 * l.val * (l.x2 - l.x1); 
                let dist = l.peak==='right' ? (l.x2-l.x1)/3 : 2*(l.x2-l.x1)/3;
                let cent = l.x2 - dist;
                c.v0 -= F; c.m1 -= F; c.m0 += F * cent;
            }
            else if (l.x1 <= xA && l.x2 >= xB) {
                let w = l.val, L = l.x2 - l.x1, x1 = l.x1;
                if (l.peak === 'right') {
                    let k = w / (6*L);
                    c.m3 -= k; c.m2 += 3*k*x1; c.m1 -= 3*k*x1*x1; c.m0 += k*x1*x1*x1;
                    let kv = w / (2*L);
                    c.v2 -= kv; c.v1 += 2*kv*x1; c.v0 -= kv*x1*x1;
                } else {
                    c.m2 -= 0.5*w; c.m1 += w*x1; c.m0 -= 0.5*w*x1*x1;
                    c.v1 -= w; c.v0 += w*x1;
                    let k = w / (6*L);
                    c.m3 += k; c.m2 -= 3*k*x1; c.m1 += 3*k*x1*x1; c.m0 -= k*x1*x1*x1;
                    let kv = w / (2*L);
                    c.v2 += kv; c.v1 -= 2*kv*x1; c.v0 += kv*x1*x1;
                }
            }
        }
    });
    return c;
};

const formatPoly = (c: PolyCoeffs, type: 'V' | 'M') => {
    let terms: string[] = []; 
    let arr = type === 'V' ? [{p:2, v:c.v2}, {p:1, v:c.v1}, {p:0, v:c.v0}] : [{p:3, v:c.m3}, {p:2, v:c.m2}, {p:1, v:c.m1}, {p:0, v:c.m0}];
    arr.forEach(t => {
        if (Math.abs(t.v) > 0.001) {
            let sign = t.v >= 0 ? "+" : "-"; 
            if (terms.length === 0 && sign === "+") sign = ""; 
            else if (terms.length > 0) sign = " " + sign + " ";
            terms.push(`${sign}${Math.abs(t.v).toFixed(2)}${t.p === 0 ? "" : (t.p === 1 ? "x" : `x^${t.p}`)}`);
        }
    });
    return terms.length > 0 ? terms.join("") : "0.00";
};

// --- Generate Step-by-Step HTML Strings ---

export const generateDetailedSteps = (params: SimulationParams, reactions: any): StepResult[] => {
    let pts = [0, params.length];
    if(params.beamType === 'overhanging') { pts.push(params.supportA); pts.push(params.supportB); }
    
    const loads = (params.customLoads && params.customLoads.length > 0) ? params.customLoads : [
        { id: 'default', type: 'P', val: Math.abs(params.force), x: params.loadPosition } as LoadDefinition
   ];

    loads.forEach(l => { 
        if(l.type === 'P' || l.type === 'M') { if(l.x !== undefined) pts.push(l.x); }
        else { if(l.x1 !== undefined && l.x2 !== undefined) { pts.push(l.x1); pts.push(l.x2); } }
    });
    pts = [...new Set(pts)].sort((a,b) => a - b);
    
    const results: StepResult[] = [];

    for(let i=0; i<pts.length-1; i++) {
        let xA = pts[i]; 
        let xB = pts[i+1];
        if(Math.abs(xA-xB) < 0.01) continue;

        let poly = getPolynomial(xA, xB, params, reactions);
        let simplifiedV = formatPoly(poly, 'V');
        let simplifiedM = formatPoly(poly, 'M');

        // Logic for steps string generation (Simplified port for brevity)
        let eqStr = `<div class="result-box">\\( V(x) = ${simplifiedV} \\) <br> \\( M(x) = ${simplifiedM} \\)</div>`;
        let intStr = `<div class="text-xs text-slate-400 mb-2">區間積分過程 (Integration Steps):</div>` + eqStr;

        results.push({
            eq: eqStr,
            int: intStr,
            xA,
            xB
        });
    }
    return results;
};