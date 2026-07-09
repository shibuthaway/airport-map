class StepDetector {
  constructor() {
    this.threshold = 1.5; // Tunable: Magnitude threshold above gravity (~9.8)
    this.minStepTime = 300; // ms between steps (max ~3 steps per sec)
    
    this.lastStepTime = 0;
    this.lastMagnitude = 0;
    
    // Dynamic thresholding
    this.history = [];
  }

  detect(accelerometerData, timestamp) {
    const { x, y, z } = accelerometerData;
    
    // Calculate total magnitude vector of acceleration
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    // Gravity is ~9.8 m/s^2. Subtract gravity to get linear acceleration
    const linearMagnitude = Math.abs(magnitude - 9.81);
    
    this.history.push(linearMagnitude);
    if (this.history.length > 50) this.history.shift();

    // Simple peak detection
    let isStep = false;
    
    if (linearMagnitude > this.threshold && this.lastMagnitude <= this.threshold) {
      if (timestamp - this.lastStepTime > this.minStepTime) {
        isStep = true;
        this.lastStepTime = timestamp;
      }
    }

    this.lastMagnitude = linearMagnitude;
    return isStep;
  }
}

export default new StepDetector();
