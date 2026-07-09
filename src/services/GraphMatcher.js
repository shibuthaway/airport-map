class GraphMatcher {
  /**
   * Snaps a raw (x,y) point to the nearest line segment defined by the navigation graph.
   * Also checks if the point is too far from any edge (off-route).
   */
  snapToGraph(rawX, rawY, floor, nodes, edges, currentPath = []) {
    let closestPoint = { x: rawX, y: rawY };
    let minDistance = Infinity;
    let snappedEdge = null;
    
    // Filter edges by current floor
    const floorNodes = new Set(nodes.filter(n => n.floor === floor).map(n => n.id));
    const floorEdges = edges.filter(e => floorNodes.has(e.from) && floorNodes.has(e.to));

    // Construct pathEdges for checking off-route status
    const pathEdges = [];
    if (currentPath && currentPath.length > 1) {
      for (let i = 0; i < currentPath.length - 1; i++) {
        const fromId = currentPath[i].id;
        const toId = currentPath[i + 1].id;
        if (currentPath[i].floor === floor && currentPath[i+1].floor === floor) {
          pathEdges.push({ from: fromId, to: toId });
        }
      }
    }

    // Snap to ANY edge on the floor
    for (const edge of floorEdges) {
      const n1 = nodes.find(n => n.id === edge.from);
      const n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) continue;

      const projected = this.projectPointToSegment(rawX, rawY, n1.x, n1.y, n2.x, n2.y);
      const dist = this.distance(rawX, rawY, projected.x, projected.y);

      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = projected;
        snappedEdge = edge;
      }
    }

    // Check if the edge we snapped to is part of the active route
    let isOffRoute = false;
    let expectedHeading = null;
    
    if (minDistance > 150) {
      // Completely lost in the wilderness
      isOffRoute = true;
    } else if (snappedEdge && pathEdges.length > 0) {
      // Check if snappedEdge is in the active navigation path
      const matchingPathEdge = pathEdges.find(pe => 
        (pe.from === snappedEdge.from && pe.to === snappedEdge.to) ||
        (pe.from === snappedEdge.to && pe.to === snappedEdge.from)
      );
      
      if (!matchingPathEdge) {
        isOffRoute = true;
      } else {
        // Calculate expected heading for this segment
        const nFrom = nodes.find(n => n.id === matchingPathEdge.from);
        const nTo = nodes.find(n => n.id === matchingPathEdge.to);
        if (nFrom && nTo) {
          const dx = nTo.x - nFrom.x;
          const dy = nTo.y - nFrom.y;
          // Math.atan2(dy, dx) returns 0 for East, PI/2 for South, -PI/2 for North.
          // Compass heading is 0 for North, 90 for East.
          let eh = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
          if (eh < 0) eh += 360;
          expectedHeading = eh;
        }
      }
    }

    // Check if we are extremely close to a node (waypoint snapping)
    let snappedNode = null;
    if (snappedEdge) {
      const n1 = nodes.find(n => n.id === snappedEdge.from);
      const n2 = nodes.find(n => n.id === snappedEdge.to);
      if (this.distance(closestPoint.x, closestPoint.y, n1.x, n1.y) < 30) {
        snappedNode = n1;
      } else if (this.distance(closestPoint.x, closestPoint.y, n2.x, n2.y) < 30) {
        snappedNode = n2;
      }
    }

    return {
      x: closestPoint.x,
      y: closestPoint.y,
      isOffRoute,
      expectedHeading,
      snappedNode,
      snappedEdge,
      rawDistance: minDistance
    };
  }

  projectPointToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return { x: x1, y: y1 };

    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));

    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}

export default new GraphMatcher();
