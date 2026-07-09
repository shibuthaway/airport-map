class SensorService {
  constructor() {
    this.accelerometer = { x: 0, y: 0, z: 0 };
    this.gyroscope = { alpha: 0, beta: 0, gamma: 0 };
    this.orientation = { alpha: 0, beta: 0, gamma: 0, absolute: false };
    
    // Smooth out jitter using a simple low-pass filter
    this.alpha = 0.8; 
    
    this.isRunning = false;
    this.motionHandler = this.handleMotion.bind(this);
    this.orientationHandler = this.handleOrientation.bind(this);
  }

  async requestPermissions() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const motionPerm = await DeviceMotionEvent.requestPermission();
      if (motionPerm !== 'granted') return false;
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const orientPerm = await DeviceOrientationEvent.requestPermission();
      if (orientPerm !== 'granted') return false;
    }
    return true;
  }

  start() {
    if (this.isRunning) return;
    window.addEventListener('devicemotion', this.motionHandler, true);
    window.addEventListener('deviceorientation', this.orientationHandler, true);
    
    // For iOS absolute heading
    window.addEventListener('deviceorientationabsolute', this.orientationHandler, true);
    this.isRunning = true;
  }

  stop() {
    if (!this.isRunning) return;
    window.removeEventListener('devicemotion', this.motionHandler, true);
    window.removeEventListener('deviceorientation', this.orientationHandler, true);
    window.removeEventListener('deviceorientationabsolute', this.orientationHandler, true);
    this.isRunning = false;
  }

  handleMotion(event) {
    if (event.accelerationIncludingGravity) {
      // Apply Low-Pass Filter
      this.accelerometer.x = this.alpha * this.accelerometer.x + (1 - this.alpha) * event.accelerationIncludingGravity.x;
      this.accelerometer.y = this.alpha * this.accelerometer.y + (1 - this.alpha) * event.accelerationIncludingGravity.y;
      this.accelerometer.z = this.alpha * this.accelerometer.z + (1 - this.alpha) * event.accelerationIncludingGravity.z;
    }
    if (event.rotationRate) {
      this.gyroscope.alpha = event.rotationRate.alpha || 0;
      this.gyroscope.beta = event.rotationRate.beta || 0;
      this.gyroscope.gamma = event.rotationRate.gamma || 0;
    }
  }

  handleOrientation(event) {
    // If deviceorientationabsolute is available, prefer it for absolute true north
    if (event.type === 'deviceorientationabsolute') {
      this.orientation.absolute = true;
    }

    this.orientation.alpha = event.alpha || 0;
    this.orientation.beta = event.beta || 0;
    this.orientation.gamma = event.gamma || 0;
    
    if (event.webkitCompassHeading !== undefined) {
      this.orientation.webkitCompassHeading = event.webkitCompassHeading;
      this.orientation.webkitCompassAccuracy = event.webkitCompassAccuracy;
    }
  }

  getSensorData() {
    return {
      accelerometer: this.accelerometer,
      gyroscope: this.gyroscope,
      orientation: this.orientation
    };
  }
}

export default new SensorService();
