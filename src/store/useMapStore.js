import { create } from 'zustand';
import { calculateShortestPath } from '../utils/pathfinder';

const saveGraph = async (nodes, edges) => {
  try {
    await fetch('/api/save-graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges })
    });
  } catch (e) {
    console.error('Failed to save Graph via API', e);
  }
};

const computePoisFromNodes = (nodes) => {
  const pois = {};
  nodes.forEach(n => {
    if (!pois[n.floor]) pois[n.floor] = [];
    pois[n.floor].push({
      ...n,
      category: n.category || n.type,
      type: n.type || n.category
    });
  });
  return pois;
};

const genId = (name, floor) =>
  `${floor}_${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now()}`;



export const useMapStore = create((set, get) => ({
  // Mode Selection
  isAdminMode: typeof window !== 'undefined' ? !window.location.href.includes('mode=public') : true,

  // Loading State
  dataLoaded: false,

  // Floors
  floors: [],
  currentFloor: 'lounge',
  setFloor: (floor) => set({
    currentFloor: floor,
    taggingCoords: null,
    navigationPath: get().navigationStart?.floor === floor || get().navigationEnd?.floor === floor ? get().navigationPath : null
  }),

  // Graph State
  nodes: [],
  edges: [],
  pois: {}, // Computed automatically for backward compatibility with POI markers
  selectedPoi: null,
  selectPoi: (poi) => poi ? set({ selectedPoi: poi, currentFloor: poi.floor }) : set({ selectedPoi: null }),
  hoveredPoi: null,
  setHoveredPoi: (poi) => set({ hoveredPoi: poi }),

  // Indoor Positioning State
  userPosition: null, // { x, y, heading, isOffRoute, isWalking, floor }
  setUserPosition: (pos) => set({ userPosition: pos }),

  // Graph Node Actions
  addPoi: (floor, data) => get().addNode(floor, data),
  editPoi: (floor, id, data) => get().editNode(floor, id, data),
  deletePoi: (floor, id) => get().deleteNode(floor, id),

  addNode: (floor, data) => {
    const { nodes, edges } = get();
    const newNode = {
      id: genId(data.name, floor),
      floor,
      x: data.x,
      y: data.y,
      name: data.name,
      category: data.category,
      type: data.category,
      description: data.description || '',
      status: data.status || 'Open',
      imageUrl: data.imageUrl || null,
      isCustom: true
    };
    const updatedNodes = [...nodes, newNode];
    const computedPois = computePoisFromNodes(updatedNodes);
    set({ nodes: updatedNodes, pois: computedPois, selectedPoi: newNode, taggingCoords: null, taggingMode: false });
    saveGraph(updatedNodes, edges);
    return newNode;
  },

  editNode: (floor, id, data) => {
    const { nodes, edges } = get();
    const updatedNodes = nodes.map(n => n.id === id ? { ...n, ...data, type: data.category || n.category } : n);
    const computedPois = computePoisFromNodes(updatedNodes);
    const updatedPoi = updatedNodes.find(n => n.id === id);
    set({ nodes: updatedNodes, pois: computedPois, selectedPoi: updatedPoi });
    saveGraph(updatedNodes, edges);
  },

  deleteNode: (floor, id) => {
    const { nodes, edges } = get();
    const updatedNodes = nodes.filter(n => n.id !== id);
    // Cascade-delete connected edges
    const updatedEdges = edges.filter(e => e.from !== id && e.to !== id);
    const computedPois = computePoisFromNodes(updatedNodes);
    set({ nodes: updatedNodes, edges: updatedEdges, pois: computedPois, selectedPoi: null });
    saveGraph(updatedNodes, updatedEdges);
    get().calculateRoute();
  },

  dragNode: (id, x, y) => {
    const { nodes, edges } = get();
    const updatedNodes = nodes.map(n => n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n);
    const computedPois = computePoisFromNodes(updatedNodes);
    set({ nodes: updatedNodes, pois: computedPois });
    saveGraph(updatedNodes, edges);
    get().calculateRoute();
  },

  // Graph Edge Actions
  addEdge: (fromId, toId, options = {}) => {
    const { nodes, edges } = get();
    // Prevent duplicate edges (regardless of direction)
    const exists = edges.some(e =>
      (e.from === fromId && e.to === toId) ||
      (e.from === toId && e.to === fromId)
    );
    if (exists) return;

    // Calculate dynamic Euclidean distance as default weight
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);
    if (!fromNode || !toNode) return;

    const dx = fromNode.x - toNode.x;
    const dy = fromNode.y - toNode.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (fromNode.floor !== toNode.floor) {
      dist += 150;
    }

    const newEdge = {
      id: `edge_${fromId}_${toId}_${Date.now()}`,
      from: fromId,
      to: toId,
      distance: Math.round(dist),
      bidirectional: options.bidirectional !== false,
      accessible: options.accessible !== false,
      blocked: options.blocked === true
    };
    const updatedEdges = [...edges, newEdge];
    set({ edges: updatedEdges });
    saveGraph(nodes, updatedEdges);
    get().calculateRoute();
  },

  updateEdge: (edgeId, data) => {
    const { nodes, edges } = get();
    const updatedEdges = edges.map(e => e.id === edgeId ? { ...e, ...data } : e);
    set({ edges: updatedEdges, selectedEdge: get().selectedEdge?.id === edgeId ? { ...get().selectedEdge, ...data } : get().selectedEdge });
    saveGraph(nodes, updatedEdges);
    get().calculateRoute();
  },

  blockEdge: (edgeId, reason = '', duration = '') => {
    const { nodes, edges } = get();
    const updatedEdges = edges.map(e =>
      e.id === edgeId
        ? { ...e, blocked: true, blockReason: reason, blockDuration: duration, blockedAt: new Date().toISOString() }
        : e
    );
    const sel = get().selectedEdge;
    set({
      edges: updatedEdges,
      selectedEdge: sel?.id === edgeId ? { ...sel, blocked: true, blockReason: reason, blockDuration: duration } : sel
    });
    saveGraph(nodes, updatedEdges);
    get().calculateRoute();
  },

  unblockEdge: (edgeId) => {
    const { nodes, edges } = get();
    const updatedEdges = edges.map(e =>
      e.id === edgeId
        ? { ...e, blocked: false, blockReason: '', blockDuration: '', blockedAt: null }
        : e
    );
    const sel = get().selectedEdge;
    set({
      edges: updatedEdges,
      selectedEdge: sel?.id === edgeId ? { ...sel, blocked: false, blockReason: '', blockDuration: '' } : sel
    });
    saveGraph(nodes, updatedEdges);
    get().calculateRoute();
  },

  deleteEdge: (edgeId) => {
    const { nodes, edges } = get();
    const updatedEdges = edges.filter(e => e.id !== edgeId);
    set({ edges: updatedEdges });
    saveGraph(nodes, updatedEdges);
    get().calculateRoute();
  },

  deleteEdgeBetween: (fromId, toId) => {
    const { nodes, edges } = get();
    const updatedEdges = edges.filter(e =>
      !((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId))
    );
    set({ edges: updatedEdges });
    saveGraph(nodes, updatedEdges);
    get().calculateRoute();
  },

  toggleEdge: (fromId, toId) => {
    const { edges } = get();
    const existingEdge = edges.find(e =>
      (e.from === fromId && e.to === toId) ||
      (e.from === toId && e.to === fromId)
    );
    if (existingEdge) {
      get().deleteEdge(existingEdge.id);
    } else {
      get().addEdge(fromId, toId);
    }
  },

  // Edit Mode Settings
  isDrawingEdges: false,
  setIsDrawingEdges: (active) => set({ isDrawingEdges: active }),
  selectedEdge: null,
  setSelectedEdge: (edge) => set({ selectedEdge: edge }),

  // Tagging Mode
  taggingMode: false,
  taggingCoords: null,
  editingPoiId: null,
  setTaggingMode: (active) => set({
    taggingMode: active,
    taggingCoords: active ? get().taggingCoords : null,
    editingPoiId: active ? get().editingPoiId : null,
    isDrawingEdges: false
  }),
  setTaggingCoords: (coords) => set({ taggingCoords: coords }),
  setEditingPoiId: (id) => set({ editingPoiId: id }),

  // Search & Filter
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  activeFilters: [],
  toggleFilter: (cat) => {
    const cur = get().activeFilters;
    set({ activeFilters: cur.includes(cat) ? cur.filter(c => c !== cat) : [...cur, cat] });
  },
  clearFilters: () => set({ activeFilters: [] }),

  // Dummies/Stubs for backward compatibility
  routeBuilderMode: false,
  isSavingRoute: false,
  routes: {},
  draftRouteDistance: '',
  draftRoutePath: [],
  setDraftRouteDistance: (val) => set({ draftRouteDistance: val }),
  loadRoutes: async () => {},
  setRouteBuilderMode: (active) => set({ routeBuilderMode: active }),
  addDraftRouteNode: () => {},
  undoDraftRouteNode: () => {},
  saveCustomRoute: async () => {},
  deleteCustomRoute: () => {},

  // Theme
  theme: localStorage.getItem('theme') || 'dark',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    set({ theme: next });
  },

  // Map Rotation (degrees)
  mapRotation: 0,
  setMapRotation: (deg) => set({ mapRotation: ((deg % 360) + 360) % 360 }),

  // Pending zoom target — set this to zoom map to a specific SVG point
  // { x, y, scale } — AirportMap watches this and executes zoom, then clears it
  pendingZoom: null,
  zoomMapTo: (x, y, scale = 3.5) => set({ pendingZoom: { x, y, scale } }),
  clearPendingZoom: () => set({ pendingZoom: null }),

  // Zoom Actions (Registered by Map Viewport)
  zoomActions: null,
  setZoomActions: (actions) => set({ zoomActions: actions }),

  // Navigation
  navigationMode: false,
  navigationStart: null,
  navigationEnd: null,
  navigationPath: null,
  navigationDistance: 0,
  navigationEstimatedTime: 0,
    navigationRoutes: [], // Array of alternative routes
  activeRouteIndex: 0,
  navigationOptions: { wheelchairOnly: false, avoidClosed: true },
  
  setNavigationMode: (active) => active ? set({ navigationMode: true }) : get().clearNavigation(),
  
  clearNavigation: () => set({
    navigationMode: false,
    navigationStart: null,
    navigationEnd: null,
    navigationPath: null,
    navigationDistance: 0,
    navigationEstimatedTime: 0,
    navigationRoutes: [],
    activeRouteIndex: 0,
    userPosition: null
  }),
  
  setNavigationStart: (poi) => { set({ navigationStart: poi }); get().calculateRoute(); },
  setNavigationEnd: (poi) => { set({ navigationEnd: poi }); get().calculateRoute(); },
  
  setActiveRouteIndex: (index) => {
    const { navigationRoutes } = get();
    if (navigationRoutes[index]) {
      const route = navigationRoutes[index];
      set({ 
        activeRouteIndex: index,
        navigationPath: route.coordinates,
        navigationDistance: route.totalDistance,
        navigationEstimatedTime: route.estimatedTime
      });
    }
  },

  setNavigationOptions: (options) => {
    set((state) => ({ navigationOptions: { ...state.navigationOptions, ...options } }));
    get().calculateRoute();
  },

  calculateRoute: () => {
    const { navigationStart, navigationEnd, nodes, edges, navigationOptions } = get();
    if (!navigationStart || !navigationEnd) {
      set({ navigationPath: null, navigationDistance: 0, navigationEstimatedTime: 0, navigationRoutes: [], activeRouteIndex: 0 });
      return;
    }

    const routes = [];
    
    // If it's a cross-floor navigation and not wheelchair-only, try both lift and escalator paths
    if (navigationStart.floor !== navigationEnd.floor && !navigationOptions.wheelchairOnly) {
      const liftResult = calculateShortestPath(nodes, edges, navigationStart.id, navigationEnd.id, { ...navigationOptions, preferredVertical: 'lift' });
      const escalatorResult = calculateShortestPath(nodes, edges, navigationStart.id, navigationEnd.id, { ...navigationOptions, preferredVertical: 'escalator' });
      
      // Filter out duplicate or null paths
      const pathSignatures = new Set();
      
      if (liftResult) {
        const sig = liftResult.coordinates.map(n => n.id).join(',');
        pathSignatures.add(sig);
        routes.push({ ...liftResult, type: 'Elevator' });
      }
      
      if (escalatorResult) {
        const sig = escalatorResult.coordinates.map(n => n.id).join(',');
        if (!pathSignatures.has(sig)) {
          routes.push({ ...escalatorResult, type: 'Escalator' });
        }
      }
    } else {
      // Single floor or wheelchair (which implies lift)
      const result = calculateShortestPath(nodes, edges, navigationStart.id, navigationEnd.id, navigationOptions);
      if (result) {
        routes.push({ ...result, type: 'Standard' });
      }
    }

    if (routes.length > 0) {
      // Sort routes by total distance so the absolute shortest is always active by default
      routes.sort((a, b) => a.totalDistance - b.totalDistance);
      
      set({
        navigationRoutes: routes,
        activeRouteIndex: 0,
        navigationPath: routes[0].coordinates,
        navigationDistance: routes[0].totalDistance,
        navigationEstimatedTime: routes[0].estimatedTime
      });
    } else {
      set({ navigationPath: null, navigationDistance: 0, navigationEstimatedTime: 0, navigationRoutes: [], activeRouteIndex: 0 });
    }
  },

  recalculatePath: (snappedNode) => {
    const { navigationEnd, nodes, edges, navigationOptions } = get();
    if (!navigationEnd || !snappedNode) return;
    
    const result = calculateShortestPath(nodes, edges, snappedNode.id, navigationEnd.id, navigationOptions);
    if (result) {
      set({
        navigationPath: result.coordinates,
        navigationDistance: result.totalDistance,
        navigationEstimatedTime: result.estimatedTime
      });
    }
  },

  loadMapData: async () => {
    try {
      const [floorsRes, graphRes] = await Promise.all([
        fetch('/api/load-floors'),
        fetch('/api/load-graph')
      ]);
      if (floorsRes.ok && graphRes.ok) {
        const floors = await floorsRes.json();
        const graph = await graphRes.json();
        const nodes = graph.nodes || [];
        const edges = graph.edges || [];
        const computedPois = computePoisFromNodes(nodes);
        
        let topFloorId = floors[0]?.id || 'lounge';
        if (floors && floors.length > 0) {
          const sorted = [...floors].sort((a, b) => {
            const numA = parseInt(a.level.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.level.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
          });
          topFloorId = sorted[sorted.length - 1].id;
        }

        set({ floors, nodes, edges, pois: computedPois, currentFloor: topFloorId, dataLoaded: true });
      } else {
        // Even on error, mark loaded so UI doesn't block forever
        set({ dataLoaded: true });
      }
    } catch (e) {
      console.error('Failed to load map data from APIs', e);
      set({ dataLoaded: true });
    }
  },

  addFloor: async (level, name, imageUrl) => {
    const { floors, nodes, edges } = get();
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
    const newFloor = { id, level, name, image: imageUrl };
    const updatedFloors = [...floors, newFloor];

    try {
      await fetch('/api/save-floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFloors)
      });
      set({ floors: updatedFloors, currentFloor: id });
    } catch (e) {
      console.error('Failed to add floor', e);
    }
  },

  editFloor: async (id, level, name, imageUrl) => {
    const { floors } = get();
    const updatedFloors = floors.map(f => f.id === id ? { ...f, level, name, image: imageUrl } : f);

    try {
      await fetch('/api/save-floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFloors)
      });
      set({ floors: updatedFloors });
    } catch (e) {
      console.error('Failed to edit floor', e);
    }
  },

  deleteFloor: async (id) => {
    const { floors, nodes, edges, currentFloor } = get();
    const updatedFloors = floors.filter(f => f.id !== id);
    const updatedNodes = nodes.filter(n => n.floor !== id);
    const updatedEdges = edges.filter(e => {
      const fromNode = nodes.find(n => n.id === e.from);
      const toNode = nodes.find(n => n.id === e.to);
      return fromNode && toNode && fromNode.floor !== id && toNode.floor !== id;
    });

    let nextFloor = currentFloor;
    if (currentFloor === id) {
      nextFloor = updatedFloors[0]?.id || '';
    }

    try {
      await fetch('/api/save-floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFloors)
      });
      set({ floors: updatedFloors, nodes: updatedNodes, edges: updatedEdges, pois: computePoisFromNodes(updatedNodes), currentFloor: nextFloor });
      saveGraph(updatedNodes, updatedEdges);
    } catch (e) {
      console.error('Failed to delete floor', e);
    }
  },

  getFlatPois: () => get().nodes.filter(n => n.category !== 'waypoint'),

  exportFloorData: (floor) => {
    const data = get().nodes.filter(n => n.floor === floor);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${floor}_nodes.json`; a.click();
    URL.revokeObjectURL(url);
  },

  resetToDefaults: () => {
    saveGraph([], []);
    set({ nodes: [], edges: [], pois: {}, selectedPoi: null });
  },
}));

// Background timer to auto-unblock edges based on blockDuration (datetime-local format)
setInterval(() => {
  const store = useMapStore.getState();
  if (store.edges) {
    const now = new Date();
    let hasExpiredEdges = false;
    
    store.edges.forEach(e => {
      if (e.blocked && e.blockDuration) {
        const unblockTime = new Date(e.blockDuration);
        // If it's a valid date and the current time has passed it
        if (!isNaN(unblockTime.getTime()) && now >= unblockTime) {
          hasExpiredEdges = true;
          // Note: store.unblockEdge updates the store and saves to DB internally.
          // Since it modifies state, calling it multiple times might cause rapid re-renders,
          // but usually only one or two edges expire at the exact same minute.
          store.unblockEdge(e.id);
        }
      }
    });
  }
}, 30000); // Run every 30 seconds
