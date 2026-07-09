/**
 * A* Pathfinder for Airport Indoor Navigation
 */

// ──────────────────────────────────────────────────────────────────────────────
// getEffectiveEdges
//
// Returns the full list of edges used for pathfinding.
// Only POIs (shops, gates, etc.) are auto-connected to their nearest
// backbone node (waypoint / lift / escalator).
// Backbone nodes are connected MANUALLY by the admin via Edge Mode.
// ──────────────────────────────────────────────────────────────────────────────
export function getEffectiveEdges(nodes, edges) {
  const effectiveEdges = [...edges];

  // Helper: check if an edge already exists between two nodes
  const edgeExists = (idA, idB) =>
    effectiveEdges.some(e =>
      (e.from === idA && e.to === idB) ||
      (e.from === idB && e.to === idA)
    );

  // Helper: Euclidean distance between two nodes
  const dist = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Group nodes by floor
  const nodesByFloor = {};
  nodes.forEach(n => {
    if (!nodesByFloor[n.floor]) nodesByFloor[n.floor] = [];
    nodesByFloor[n.floor].push(n);
  });

  const BACKBONE_TYPES = ['waypoint', 'lift', 'escalator'];

  // Auto-connect every POI to its nearest backbone node on the same floor,
  // but only if that POI has no explicit (manually drawn) edges already.
  nodes.forEach(n => {
    const cat = n.category || n.type || '';
    const name = (n.name || '').toLowerCase();
    const isBackbone = BACKBONE_TYPES.includes(cat) || 
                       name.includes('lift') || name.includes('elevator') || name.includes('escalator');
    
    if (isBackbone) return; // POIs only

    // Skip if already connected explicitly
    const hasExplicit = edges.some(e => e.from === n.id || e.to === n.id);
    if (hasExplicit) return;

    const floorNodes = nodesByFloor[n.floor] || [];
    const backboneNodes = floorNodes.filter(fn => {
      const cat = fn.category || fn.type || '';
      const name = (fn.name || '').toLowerCase();
      return BACKBONE_TYPES.includes(cat) || 
             name.includes('lift') || name.includes('elevator') || name.includes('escalator');
    });

    if (backboneNodes.length > 0) {
      // Find nearest backbone node
      let closestNode = null;
      let minDist = Infinity;
      backboneNodes.forEach(bn => {
        const d = dist(n, bn);
        if (d < minDist) { minDist = d; closestNode = bn; }
      });

      if (closestNode && !edgeExists(n.id, closestNode.id)) {
        effectiveEdges.push({
          id: `auto-poi-${n.id}-${closestNode.id}`,
          from: n.id,
          to: closestNode.id,
          distance: Math.round(minDist),
          bidirectional: true,
          accessible: true,
          isAuto: true
        });
      }
    }
  });

  // Auto-connect vertical transit nodes (Lifts & Escalators) across floors
  const verticalNodes = nodes.filter(n => {
    const cat = n.category || n.type || '';
    const name = (n.name || '').toLowerCase();
    return cat === 'lift' || cat === 'escalator' || 
           name.includes('lift') || name.includes('elevator') || name.includes('escalator');
  });
  
  // Group by floor
  const verticalsByFloor = {};
  verticalNodes.forEach(n => {
    if (!verticalsByFloor[n.floor]) verticalsByFloor[n.floor] = [];
    verticalsByFloor[n.floor].push(n);
  });

  const getVerticalType = (n) => {
    const cat = (n.category || n.type || '').toLowerCase();
    if (cat === 'escalator') return 'escalator';
    if (cat === 'lift' || cat === 'elevator') return 'lift';
    
    const name = (n.name || '').toLowerCase();
    if (name.includes('escalator')) return 'escalator';
    if (name.includes('lift') || name.includes('elevator')) return 'lift';
    return 'unknown';
  };

  const floors = Object.keys(verticalsByFloor);
  
  // For each floor, connect its vertical nodes to the CLOSEST vertical node of the SAME TYPE on other floors
  for (let i = 0; i < floors.length; i++) {
    for (let j = i + 1; j < floors.length; j++) {
      const floorA = floors[i];
      const floorB = floors[j];
      
      verticalsByFloor[floorA].forEach(nA => {
        const typeA = getVerticalType(nA);
        
        // Find matching nodes on Floor B
        const candidatesB = verticalsByFloor[floorB].filter(nB => getVerticalType(nB) === typeA);
        
        if (candidatesB.length > 0) {
          let closestB = null;
          let minDist = Infinity;
          candidatesB.forEach(nB => {
            const d = dist(nA, nB);
            if (d < minDist) { minDist = d; closestB = nB; }
          });
          
          if (closestB && !edgeExists(nA.id, closestB.id)) {
            effectiveEdges.push({
              id: `auto-vertical-${nA.id}-${closestB.id}`,
              from: nA.id,
              to: closestB.id,
              bidirectional: true,
              accessible: typeA === 'lift',
              isAuto: true,
              isVertical: true
            });
          }
        }
      });
    }
  }

  // Auto-connect isolated vertical nodes on the same floor to bridge graph fragments
  Object.values(verticalsByFloor).forEach(vNodesOnFloor => {
    if (vNodesOnFloor.length < 1) return;
    const floor = vNodesOnFloor[0].floor;
    const floorNodes = nodesByFloor[floor] || [];
    const waypoints = floorNodes.filter(n => (n.category || n.type) === 'waypoint');

    vNodesOnFloor.forEach(vNode => {
      // Connect isolated vertical nodes to the nearest waypoint
      const hasExplicit = edges.some(e => e.from === vNode.id || e.to === vNode.id);
      if (!hasExplicit && waypoints.length > 0) {
        let closestWp = null;
        let minDist = Infinity;
        waypoints.forEach(wp => {
          const d = dist(vNode, wp);
          if (d < minDist) { minDist = d; closestWp = wp; }
        });
        
        if (closestWp && !edgeExists(vNode.id, closestWp.id)) {
          effectiveEdges.push({
            id: `auto-bridge-wp-${vNode.id}-${closestWp.id}`,
            from: vNode.id,
            to: closestWp.id,
            distance: Math.round(minDist),
            bidirectional: true,
            accessible: true,
            isAuto: true
          });
        }
      }

      // If no waypoints exist at all, connect all vertical nodes on this floor to each other 
      // so POIs connected to an Escalator can still route to an Elevator if needed
      if (waypoints.length === 0) {
        vNodesOnFloor.forEach(otherVNode => {
          if (vNode.id !== otherVNode.id && !edgeExists(vNode.id, otherVNode.id)) {
            effectiveEdges.push({
              id: `auto-bridge-vnodes-${vNode.id}-${otherVNode.id}`,
              from: vNode.id,
              to: otherVNode.id,
              distance: Math.round(dist(vNode, otherVNode)),
              bidirectional: true,
              accessible: true, // Internal floor connection
              isAuto: true
            });
          }
        });
      }
    });
  });

  return effectiveEdges;
}

// ──────────────────────────────────────────────────────────────────────────────
// calculateShortestPath  —  A* search
// ──────────────────────────────────────────────────────────────────────────────
export function calculateShortestPath(nodes, edges, startNodeId, endNodeId, options = {}) {
  const { wheelchairOnly = false, avoidClosed = true, preferredVertical = null } = options;

  if (!startNodeId || !endNodeId) return null;

  const effectiveEdges = getEffectiveEdges(nodes, edges);

  const getVerticalType = (n) => {
    const cat = (n.category || n.type || '').toLowerCase();
    if (cat === 'escalator') return 'escalator';
    if (cat === 'lift' || cat === 'elevator') return 'lift';
    const name = (n.name || '').toLowerCase();
    if (name.includes('escalator')) return 'escalator';
    if (name.includes('lift') || name.includes('elevator')) return 'lift';
    return 'unknown';
  };

  // Build adjacency map
  const graph = {};
  nodes.forEach(n => {
    graph[n.id] = { node: n, neighbors: [] };
  });

  effectiveEdges.forEach(e => {
    if (wheelchairOnly && e.accessible === false) return;
    if (avoidClosed && e.blocked === true) return;

    const fromNode = graph[e.from];
    const toNode = graph[e.to];

    if (fromNode && toNode) {
      const dx = fromNode.node.x - toNode.node.x;
      const dy = fromNode.node.y - toNode.node.y;
      let weight = Math.sqrt(dx * dx + dy * dy);

      // Floor-change logic
      if (fromNode.node.floor !== toNode.node.floor) {
        weight += 150; // standard penalty
        
        // If a preference is set, heavily penalize the non-preferred vertical transit type
        if (preferredVertical) {
          const typeFrom = getVerticalType(fromNode.node);
          const typeTo = getVerticalType(toNode.node);
          
          if (typeFrom !== preferredVertical && typeTo !== preferredVertical) {
            weight += 1000000; // massive penalty to force A* to avoid this edge if an alternative exists
          }
        }
      }

      // Admin-specified distance override
      if (e.distance !== undefined && e.distance !== null) {
        weight = parseFloat(e.distance);
      }

      fromNode.neighbors.push({ to: e.to, weight });
      if (e.bidirectional !== false) {
        toNode.neighbors.push({ to: e.from, weight });
      }
    }
  });

  // A* search structures
  const openSet = new Set([startNodeId]);
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  nodes.forEach(n => {
    gScore[n.id] = Infinity;
    fScore[n.id] = Infinity;
  });

  gScore[startNodeId] = 0;

  const startNode = nodes.find(n => n.id === startNodeId);
  const endNode   = nodes.find(n => n.id === endNodeId);
  if (!startNode || !endNode) return null;

  // Heuristic: straight-line distance + floor-change penalty
  const heuristic = (nId1, nId2) => {
    const n1 = nodes.find(n => n.id === nId1);
    const n2 = nodes.find(n => n.id === nId2);
    if (!n1 || !n2) return 0;
    const dx = n1.x - n2.x;
    const dy = n1.y - n2.y;
    let base = Math.sqrt(dx * dx + dy * dy);
    if (n1.floor !== n2.floor) base += 150;
    return base;
  };

  fScore[startNodeId] = heuristic(startNodeId, endNodeId);

  while (openSet.size > 0) {
    // Pick node with lowest fScore from openSet
    let currentId = null;
    let minF = Infinity;
    openSet.forEach(nId => {
      if (fScore[nId] < minF) { minF = fScore[nId]; currentId = nId; }
    });

    if (currentId === endNodeId) {
      // Reconstruct path
      const pathNodes = [];
      let temp = currentId;
      while (temp !== undefined) {
        const nObj = nodes.find(n => n.id === temp);
        if (nObj) pathNodes.unshift(nObj);
        temp = cameFrom[temp];
      }

      // Total distance
      let totalDistance = 0;
      for (let i = 0; i < pathNodes.length - 1; i++) {
        const curr = pathNodes[i];
        const next = pathNodes[i + 1];
        const dx = curr.x - next.x;
        const dy = curr.y - next.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (curr.floor !== next.floor) d += 150;
        totalDistance += d;
      }

      // 1 unit ≈ 0.5 m; walking speed ≈ 80 m/min
      const distanceInMeters = Math.round(totalDistance * 0.5);
      const estimatedTime    = Math.max(1, Math.round(distanceInMeters / 80));

      return {
        totalDistance: distanceInMeters,
        estimatedTime,
        nodes: pathNodes,
        coordinates: pathNodes.map(n => ({ id: n.id, x: n.x, y: n.y, floor: n.floor }))
      };
    }

    openSet.delete(currentId);

    const neighbors = graph[currentId]?.neighbors || [];
    for (const neighbor of neighbors) {
      const neighborId   = neighbor.to;
      const tentativeG   = gScore[currentId] + neighbor.weight;

      if (tentativeG < gScore[neighborId]) {
        cameFrom[neighborId] = currentId;
        gScore[neighborId]   = tentativeG;
        fScore[neighborId]   = tentativeG + heuristic(neighborId, endNodeId);
        openSet.add(neighborId);
      }
    }
  }

  return null; // No path found
}
