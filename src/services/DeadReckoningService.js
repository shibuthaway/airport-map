class DeadReckoningService {
  constructor() {
    this.x = 0;
    this.y = 0;
    // Assume 1 step = 0.7 meters. We need a pixels-per-meter scale. 
    // Typical airport maps might have ~20 pixels per meter.
    this.pixelsPerStep = 15; 
  }

  setInitialPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  updatePosition(headingDegrees) {
    // Convert heading from Degrees to Radians
    // Note: In SVG/Canvas, Y increases downwards. 
    // A heading of 0 (North) means moving UP (negative Y).
    // A heading of 90 (East) means moving RIGHT (positive X).
    
    // Adjust standard compass math for screen coordinates:
    // Screen X = Math.sin(rad)
    // Screen Y = -Math.cos(rad)
    
    const headingRad = headingDegrees * (Math.PI / 180);
    
    const dx = this.pixelsPerStep * Math.sin(headingRad);
    const dy = -this.pixelsPerStep * Math.cos(headingRad);

    this.x += dx;
    this.y += dy;

    return { x: this.x, y: this.y };
  }
}

export default new DeadReckoningService();
