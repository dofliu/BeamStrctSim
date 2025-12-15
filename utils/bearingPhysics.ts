import { BearingParams } from '../types';

export interface BearingElement {
    angle: number;      // Position angle in radians
    load: number;       // Load on this specific ball (N)
    maxStress: number;  // Hertzian contact stress (MPa)
    deformation: number;// Compression (mm)
    x: number;          // Center X
    y: number;          // Center Y
    radius: number;     // Ball radius
}

/**
 * Calculates the load distribution among rolling elements using Stribeck's approximation.
 * F_max = (4.37 * Fr) / Z
 */
export const calculateBearingPhysics = (params: BearingParams): BearingElement[] => {
    const { outerRadius, innerRadius, ballCount, radialLoad } = params;
    
    // Geometry
    const pitchRadius = (outerRadius + innerRadius) / 2;
    const ballDiameter = (outerRadius - innerRadius); // Assuming simplified full fill for visualization
    const ballRadius = ballDiameter / 2;
    
    // Stribeck's constant approximation for radial load
    // The load is distributed over a 180 degree arc (load zone)
    // The max load is on the ball directly under the load vector (assumed at 270 deg / -90 deg)
    
    // Stribeck factor roughly 4.37/Z for radial bearings with clearance
    // Ideally: Qmax = Fr * 5 / Z (for zero clearance)
    const stribeckFactor = 5; 
    const maxBallLoad = (radialLoad * stribeckFactor) / Math.max(1, ballCount);
    
    const elements: BearingElement[] = [];
    
    // Assume Load Vector is pointing DOWN (270 degrees or 3*PI/2)
    const loadVectorAngle = 3 * Math.PI / 2;

    for (let i = 0; i < ballCount; i++) {
        // Angle of the ball center
        const theta = (2 * Math.PI * i) / ballCount;
        
        // Calculate angular distance from the load vector
        // We need the smallest angle difference
        let angleDiff = Math.abs(theta - loadVectorAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        // Load Distribution Function
        // Load exists only if angleDiff < PI/2 (90 degrees)
        // Distribution follows: Q(psi) = Qmax * [1 - (1/2e)*(1-cos(psi))]^1.5
        // Simplified cosine distribution for visualization: Q = Qmax * cos(angleDiff)^1.5
        
        let ballLoad = 0;
        if (angleDiff < Math.PI / 2) {
            ballLoad = maxBallLoad * Math.pow(Math.cos(angleDiff), 1.5);
        }

        // Hertzian Contact Stress Approximation (Cylinder on Cylinder/Sphere)
        // Stress is proportional to sqrt(Load)
        // This is a simplified scalar for visualization coloring
        // Factor 50 is just a scaling constant to get realistic-looking MPa values for the demo
        const maxStress = ballLoad > 0 ? 50 * Math.sqrt(ballLoad / ballDiameter) : 0;
        
        // Deformation (Hertzian) roughly proportional to Load^(2/3)
        const deformation = ballLoad > 0 ? 0.001 * Math.pow(ballLoad, 2/3) : 0;

        elements.push({
            angle: theta,
            load: ballLoad,
            maxStress: maxStress,
            deformation: deformation,
            x: pitchRadius * Math.cos(theta),
            y: pitchRadius * Math.sin(theta), // Invert Y for screen coords usually handled by renderer
            radius: ballRadius
        });
    }

    return elements;
};

/**
 * Generates a "fake" mesh for a single ball to visualize internal stress distribution.
 * Stress is highest at contact points (top/bottom) and lower in the center.
 */
export const generateBallMesh = (element: BearingElement, meshResolution: number = 8) => {
    const points = [];
    const { x: cx, y: cy, radius, maxStress } = element;
    
    // Create a grid of points inside the circle
    for (let r = 0; r <= meshResolution; r++) {
        const dist = (r / meshResolution) * radius;
        const ringCount = r === 0 ? 1 : r * 6; // Hexagonal-ish growth
        
        for (let a = 0; a < ringCount; a++) {
            const angle = (2 * Math.PI * a) / ringCount;
            const px = cx + dist * Math.cos(angle);
            const py = cy + dist * Math.sin(angle);
            
            // Calculate local stress at this node
            // Stress concentrates at contact points (Top and Bottom of ball relative to bearing center)
            // Vector to center of bearing: (-cx, -cy) normalized
            // Contact points are at (cx,cy) +/- radius * bearingRadialVector
            
            const bearingAngle = element.angle;
            const contact1X = cx + radius * Math.cos(bearingAngle);
            const contact1Y = cy + radius * Math.sin(bearingAngle);
            const contact2X = cx - radius * Math.cos(bearingAngle);
            const contact2Y = cy - radius * Math.sin(bearingAngle);
            
            const d1 = Math.sqrt((px - contact1X)**2 + (py - contact1Y)**2);
            const d2 = Math.sqrt((px - contact2X)**2 + (py - contact2Y)**2);
            
            // Stress decay function (approximate)
            // High at poles, low at equator
            const minD = Math.min(d1, d2);
            const localStress = maxStress * Math.exp(-2 * (minD / radius));
            
            points.push({ x: px, y: py, stress: localStress });
        }
    }
    return points;
};