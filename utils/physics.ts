import { SimulationParams, NodePoint, MeshElement } from '../types';

/**
 * Calculates Moment of Inertia (I) based on section type and dimensions.
 */
export const calculateSectionProperties = (params: SimulationParams) => {
    const { 
        height: H, 
        sectionType, 
        sectionWidth: B_rect, 
        flangeWidth: B_flange, 
        flangeThickness: tf, 
        webThickness: tw 
    } = params;

    let I = 0; // Moment of Inertia
    let area = 0; // Cross section area (for future shear calc)

    if (sectionType === 'rectangular') {
        // I = (b * h^3) / 12
        I = (B_rect * Math.pow(H, 3)) / 12;
        area = B_rect * H;
    } else if (sectionType === 'circular') {
        // I = (pi * d^4) / 64, here H is diameter
        I = (Math.PI * Math.pow(H, 4)) / 64;
        area = Math.PI * Math.pow(H/2, 2);
    } else if (sectionType === 'ibeam') {
        // I = (B * H^3 - b * h^3) / 12
        // Outer box: Width B_flange, Height H
        // Inner cutouts: Width (B_flange - tw), Height (H - 2*tf)
        const innerH = H - 2 * tf;
        const innerB = B_flange - tw;
        
        // Clamp innerH to be at least 0 to avoid NaN if user sets thickness too high
        if (innerH > 0 && innerB > 0) {
            I = ((B_flange * Math.pow(H, 3)) - (innerB * Math.pow(innerH, 3))) / 12;
            area = (2 * B_flange * tf) + (tw * innerH);
        } else {
            // Fallback if geometry is invalid, treat as solid block
            I = (B_flange * Math.pow(H, 3)) / 12;
        }
    }

    return { I, area };
};

/**
 * Calculates beam deformation and stress based on type and load position.
 */
export const calculateBeamPhysics = (params: SimulationParams): MeshElement[] => {
    const { 
        length: L, 
        height: h, 
        force: P, 
        youngsModulus: E, 
        meshDensityX, 
        meshDensityY, 
        deformationScale,
        beamType,
        loadPosition: a 
    } = params;

    // Get calculated I
    const { I } = calculateSectionProperties(params);

    // Ensure load position is within bounds
    const safeA = Math.max(0, Math.min(a, L));
    const b = L - safeA; 

    const dxStep = L / meshDensityX;
    const dyStep = h / meshDensityY;
    const scale = deformationScale || 1;

    const getNode = (i: number, j: number): NodePoint => {
        const xOriginal = i * dxStep;
        // y from neutral axis (-h/2 to h/2)
        const yOriginal = (j * dyStep) - (h / 2);
        
        let v = 0;     // Vertical deflection
        let theta = 0; // Slope (dv/dx)
        let M = 0;     // Bending Moment

        if (beamType === 'cantilever') {
            // --- Cantilever Beam (Fixed at x=0) ---
            if (xOriginal <= safeA) {
                v = (P * Math.pow(xOriginal, 2) * (3 * safeA - xOriginal)) / (6 * E * I);
                theta = (P * xOriginal * (2 * safeA - xOriginal)) / (2 * E * I);
                M = P * (xOriginal - safeA);
            } else {
                const v_a = (P * Math.pow(safeA, 3)) / (3 * E * I);
                const theta_a = (P * Math.pow(safeA, 2)) / (2 * E * I);
                v = v_a + theta_a * (xOriginal - safeA);
                theta = theta_a;
                M = 0; 
            }

        } else if (beamType === 'simplySupported') {
            // --- Simply Supported Beam ---
            if (xOriginal <= safeA) {
                v = (P * b * xOriginal) / (6 * L * E * I) * (Math.pow(L, 2) - Math.pow(b, 2) - Math.pow(xOriginal, 2));
                M = (P * b * xOriginal) / L;
                theta = (P * b) / (6 * L * E * I) * (Math.pow(L, 2) - Math.pow(b, 2) - 3 * Math.pow(xOriginal, 2));
            } else {
                const xFromRight = L - xOriginal;
                v = (P * safeA * xFromRight) / (6 * L * E * I) * (Math.pow(L, 2) - Math.pow(safeA, 2) - Math.pow(xFromRight, 2));
                M = (P * safeA * (L - xOriginal)) / L;
                
                const term = (Math.pow(L, 2) - Math.pow(safeA, 2) - 3 * Math.pow(xFromRight, 2));
                const thetaFromRight = (P * safeA) / (6 * L * E * I) * term;
                theta = -thetaFromRight;
            }
        }

        const u = -yOriginal * theta;
        const stress = -(M * yOriginal) / I;

        return {
            id: `${i}-${j}`,
            x: xOriginal,
            y: yOriginal,
            dx: xOriginal + (u * scale),
            dy: yOriginal + (v * scale),
            stress: stress
        };
    };

    const elements: MeshElement[] = [];

    for (let i = 0; i < meshDensityX; i++) {
        for (let j = 0; j < meshDensityY; j++) {
            const p1 = getNode(i, j);
            const p2 = getNode(i + 1, j);
            const p3 = getNode(i + 1, j + 1);
            const p4 = getNode(i, j + 1);

            const avgStress = (p1.stress + p2.stress + p3.stress + p4.stress) / 4;

            elements.push({
                id: `el-${i}-${j}`,
                nodes: [p1, p2, p3, p4],
                avgStress
            });
        }
    }

    return elements;
};

/**
 * Calculates key statistics (Max Stress, Max Deflection) from mesh elements.
 */
export const calculateBeamStats = (elements: MeshElement[]) => {
    let maxStress = 0;
    let maxDeflection = 0;
    
    elements.forEach(el => {
        el.nodes.forEach(n => {
            const stressAbs = Math.abs(n.stress);
            if (stressAbs > maxStress) maxStress = stressAbs;
            
            const deflection = Math.abs(n.dy - n.y);
            if (deflection > maxDeflection) maxDeflection = deflection;
        });
    });
    
    return { maxStress, maxDeflection };
};