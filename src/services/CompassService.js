class CompassService {
  constructor() {
    this.currentHeading = 0; // 0 is North, 90 East
    this.alpha = 0.5; // Low pass filter factor (lower = faster response, less smoothing)
  }

  update(orientationData) {
    let rawHeading = 0;

    // iOS WebKit specific true north
    if (orientationData.webkitCompassHeading !== undefined) {
      rawHeading = orientationData.webkitCompassHeading;
    } 
    // Android Absolute orientation
    else if (orientationData.alpha !== null) {
      // Chrome/Android absolute alpha is usually 360 - alpha
      rawHeading = 360 - orientationData.alpha;
    }

    // Handle 360 degree wrap-around smoothing
    const diff = rawHeading - this.currentHeading;
    if (diff > 180) {
      this.currentHeading += 360;
    } else if (diff < -180) {
      this.currentHeading -= 360;
    }

    this.currentHeading = (this.alpha * this.currentHeading) + ((1 - this.alpha) * rawHeading);
    
    // Normalize to 0-360
    this.currentHeading = (this.currentHeading % 360 + 360) % 360;

    return this.currentHeading;
  }
}

export default new CompassService();
