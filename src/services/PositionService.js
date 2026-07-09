import SensorService from './SensorService';
import CompassService from './CompassService';
import StepDetector from './StepDetector';
import DeadReckoningService from './DeadReckoningService';
import GraphMatcher from './GraphMatcher';

class PositionService {
  constructor() {
    this.animationFrameId = null;
    this.callbacks = [];
    this.isNavigating = false;
    
    this.currentFloor = null;
    this.nodes = [];
    this.edges = [];
    this.navigationPath = [];
  }

  setGraphData(floor, nodes, edges, currentPath = []) {
    this.currentFloor = floor;
    this.nodes = nodes;
    this.edges = edges;
    this.navigationPath = currentPath;
  }

  setInitialPosition(x, y, floor) {
    DeadReckoningService.setInitialPosition(x, y);
    this.currentFloor = floor;
  }

  async start() {
    if (this.isNavigating) return;
    
    const hasPermissions = await SensorService.requestPermissions();
    if (!hasPermissions) {
      console.warn("Sensor permissions denied");
      return false;
    }

    SensorService.start();
    this.isNavigating = true;
    this.loop();
    return true;
  }

  stop() {
    this.isNavigating = false;
    SensorService.stop();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  subscribe(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  notify(data) {
    this.callbacks.forEach(cb => cb(data));
  }

  loop() {
    if (!this.isNavigating) return;

    const timestamp = Date.now();
    const sensorData = SensorService.getSensorData();
    
    // Update Heading
    const heading = CompassService.update(sensorData.orientation);
    
    // Detect Steps
    const isStep = StepDetector.detect(sensorData.accelerometer, timestamp);
    
    let rawPos = { x: DeadReckoningService.x, y: DeadReckoningService.y };
    let didMove = false;

    if (isStep) {
      // Calculate new PDR position
      rawPos = DeadReckoningService.updatePosition(heading);
      didMove = true;
    }

    // Always snap to map (even if just standing and turning, we might want to update heading UI)
    const snapped = GraphMatcher.snapToGraph(
      rawPos.x, 
      rawPos.y, 
      this.currentFloor, 
      this.nodes, 
      this.edges,
      this.navigationPath
    );

    // Always correct the internal dead reckoning position so they can walk smoothly anywhere on the graph
    if (snapped.snappedEdge) {
      DeadReckoningService.setInitialPosition(snapped.x, snapped.y);
    }

    let isWrongDirection = false;
    if (snapped.expectedHeading !== null && !snapped.isOffRoute) {
      let diff = Math.abs(heading - snapped.expectedHeading);
      if (diff > 180) diff = 360 - diff;
      // If facing more than 100 degrees away from the correct direction
      if (diff > 100) {
        isWrongDirection = true;
      }
    }

    this.notify({
      x: snapped.x,
      y: snapped.y,
      heading,
      isOffRoute: snapped.isOffRoute,
      isWrongDirection,
      snappedNode: snapped.snappedNode,
      isWalking: isStep,
      didMove
    });

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
}

export default new PositionService();
