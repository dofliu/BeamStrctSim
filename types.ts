export type BeamType = 'cantilever' | 'simplySupported' | 'overhanging';
export type SectionType = 'rectangular' | 'circular' | 'ibeam';

export type LoadType = 'P' | 'U' | 'T' | 'M';

export interface LoadDefinition {
    id: string;
    type: LoadType;
    val: number;
    x?: number;
    x1?: number;
    x2?: number;
    peak?: 'left' | 'right';
}

// --- Bearing Types ---
export interface BearingParams {
    outerRadius: number;  // mm
    innerRadius: number;  // mm
    ballCount: number;    // number of elements
    radialLoad: number;   // N
    rotationSpeed: number; // RPM (for future animation)
    contactAngle: number; // Degrees (0 for radial bearing)
}

export type SimMode = 'beam' | 'bearing';

export interface SimulationParams {
    // --- Common / Beam ---
    length: number;      
    height: number;      
    force: number;       
    youngsModulus: number; 
    yieldStrength: number; 
    meshDensityX: number; 
    meshDensityY: number; 
    deformationScale: number; 
    beamType: BeamType;   
    loadPosition: number; 
    
    supportA: number; 
    supportB: number; 
    customLoads: LoadDefinition[]; 

    sectionType: SectionType;
    sectionWidth: number; 
    flangeWidth: number;  
    flangeThickness: number; 
    webThickness: number; 

    // --- Bearing Specific ---
    mode: SimMode; // Discriminator
    bearing: BearingParams;
}

export interface SimulationInstance {
    id: string;
    name: string;
    params: SimulationParams;
}

export interface NodePoint {
    id: string;
    x: number;       
    y: number;       
    dx: number;      
    dy: number;      
    stress: number;  
}

export interface MeshElement {
    id: string;
    nodes: [NodePoint, NodePoint, NodePoint, NodePoint]; 
    avgStress: number;
}