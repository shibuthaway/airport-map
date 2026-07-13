import { create } from 'zustand';
import { calculateShortestPath } from '../utils/pathfinder';

const saveGraph = async (nodes, edges) => {
  const state = useMapStore.getState();
  try {
    await fetch('/api/save-graph', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {})
      },
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
  // Auth State
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('ap_token') : null,
  logout: () => {
    localStorage.removeItem('ap_token');
    set({ user: null, token: null, isAdminMode: false, dataLoaded: false });
    // Hard redirect to /login — avoids React Router white-screen flash
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  // App Settings (Branding)
  appSettings: { name: 'Airport Indoor Map', logo_url: null },

  // Mode Selection
  isAdminMode: typeof window !== 'undefined' ? !!localStorage.getItem('ap_token') : false,

  // Loading State
  dataLoaded: false,

  // Toast Notifications
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now();
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  // Buildings & Categories
  buildings: [],
  currentBuilding: null,
  categories: [],
  setBuilding: (buildingId) => {
    set({ currentBuilding: buildingId, floors: [], nodes: [], edges: [], pois: {} });
    get().loadMapData();
  },

  loadBuildings: async (projectId) => {
    try {
      const res = await fetch(`/api/load-buildings?project=${projectId}`);
      if (res.ok) {
        const buildings = await res.json();
        if (buildings && buildings.length > 0) {
          set({ buildings });
          return buildings;
        }
      }
    } catch (e) {
      console.error('Failed to load buildings', e);
    }
    
    // Fallback only if project is 'default'
    const fallbackBuildings = projectId === 'default' 
      ? [{ id: 'bldg_default', name: 'Chennai Terminal 1' }] 
      : [];
    set({ buildings: fallbackBuildings });
    return fallbackBuildings;
  },

  addBuilding: async (name, description) => {
    const { buildings } = get();
    const newBuilding = { id: `bldg_${Date.now()}`, name, description };
    const updated = [...buildings, newBuilding];
    
    try {
      await fetch('/api/save-buildings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(get().token ? { 'Authorization': `Bearer ${get().token}` } : {})
        },
        body: JSON.stringify(updated)
      });
      set({ buildings: updated });
      if (!get().currentBuilding) get().setBuilding(newBuilding.id);
    } catch (e) {
      console.error('Failed to add building', e);
    }
  },

  deleteBuilding: async (id) => {
    const { buildings, currentBuilding } = get();
    const updated = buildings.filter(b => b.id !== id);
    
    try {
      await fetch('/api/save-buildings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(get().token ? { 'Authorization': `Bearer ${get().token}` } : {})
        },
        body: JSON.stringify(updated)
      });
      set({ buildings: updated });
      if (currentBuilding === id) {
        get().setBuilding(updated[0]?.id || null);
      }
    } catch (e) {
      console.error('Failed to delete building', e);
    }
  },

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
  
  // Full Screen Mode
  isFullScreen: false,
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),

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

  dragEdgeCurve: (id, cx, cy) => {
    const { nodes, edges } = get();
    const updatedEdges = edges.map(e => e.id === id ? { ...e, controlPoint: { x: Math.round(cx), y: Math.round(cy) } } : e);
    const sel = get().selectedEdge;
    set({ 
      edges: updatedEdges,
      selectedEdge: sel?.id === id ? { ...sel, controlPoint: { x: Math.round(cx), y: Math.round(cy) } } : sel
    });
    saveGraph(nodes, updatedEdges);
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
      distance: options.distance !== undefined && options.distance !== null ? options.distance : Math.round(dist),
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

  toggleEdge: (fromId, toId, options = {}) => {
    const { edges } = get();
    const existingEdge = edges.find(e =>
      (e.from === fromId && e.to === toId) ||
      (e.from === toId && e.to === fromId)
    );
    if (existingEdge) {
      get().deleteEdge(existingEdge.id);
    } else {
      get().addEdge(fromId, toId, options);
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

  loadMapData: async (retries = 3) => {
    try {
      let projectId = 'default';
      if (typeof window !== 'undefined') {
        const pathMatch = window.location.pathname.match(/^\/map\/([^/]+)/);
        if (pathMatch) {
          projectId = pathMatch[1];
        } else {
          const params = new URLSearchParams(window.location.search);
          if (params.get('project')) projectId = params.get('project');
        }
      }

      const buildings = await get().loadBuildings(projectId);
      let activeBuildingId = get().currentBuilding;
      if (!activeBuildingId && buildings.length > 0) {
        activeBuildingId = buildings[0].id;
        set({ currentBuilding: activeBuildingId });
      }

      const buildingQuery = activeBuildingId ? `&building=${activeBuildingId}` : (projectId === 'default' ? '&building=bldg_default' : '');
      const [floorsRes, graphRes, settingsRes, catRes] = await Promise.all([
        fetch(`/api/load-floors?project=${projectId}${buildingQuery}`),
        fetch(`/api/load-graph?project=${projectId}`),
        fetch(`/api/load-settings?project=${projectId}`),
        fetch(`/api/load-categories?project=${projectId}`)
      ]);
      if (floorsRes.ok && graphRes.ok) {
        const floors = await floorsRes.json();
        const graph = await graphRes.json();
        const settings = settingsRes.ok ? await settingsRes.json() : { name: 'Airport Indoor Map', logo_url: null };
        const categories = catRes.ok ? await catRes.json() : [];
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

        set({ floors, nodes, edges, pois: computedPois, currentFloor: topFloorId, appSettings: settings, categories, dataLoaded: true });

        // ── Prefetch all floor map images for offline use ──────────────────
        // This ensures Service Worker caches every floor image immediately,
        // not just the currently active floor.
        if ('serviceWorker' in navigator && floors?.length) {
          const imageUrls = floors
            .map(f => f.image)
            .filter(Boolean);
          // Use cache API directly to warm up the map cache
          caches.open('airport-maps-v1').then(cache => {
            imageUrls.forEach(url => {
              // Only fetch if not already cached
              cache.match(url).then(cached => {
                if (!cached) {
                  fetch(url, { cache: 'no-store' })
                    .then(res => { if (res.ok) cache.put(url, res); })
                    .catch(() => {}); // Silent fail — offline already
                }
              });
            });
            console.log(`[SW Cache] Prefetching ${imageUrls.length} floor map image(s) for offline use.`);
          }).catch(() => {});
        }
      } else {
        if (retries > 0) {
          console.warn(`API returned ${floorsRes.status}, retrying...`);
          setTimeout(() => useMapStore.getState().loadMapData(retries - 1), 2000);
          return;
        }
        set({ dataLoaded: true });
      }
    } catch (e) {
      console.error('Failed to load map data from APIs', e);
      if (retries > 0) {
        setTimeout(() => useMapStore.getState().loadMapData(retries - 1), 2000);
        return;
      }
      set({ dataLoaded: true });
    }
  },

  addFloor: async (level, name, imageUrl) => {
    const { floors, currentBuilding } = get();
    const newFloor = { id: `flr_${Date.now()}`, level, name, image: imageUrl || null };
    const updatedFloors = [...floors, newFloor];

    const payloadFloors = updatedFloors.map(f => ({
      ...f,
      image: f.id === newFloor.id ? f.image : '__KEEP__'
    }));

    try {
      const res = await fetch('/api/save-floors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(get().token ? { 'Authorization': `Bearer ${get().token}` } : {})
        },
        body: JSON.stringify({ floors: payloadFloors, buildingId: currentBuilding || 'bldg_default' })
      });
      if (!res.ok) throw new Error('Failed to save floor to API');
      set({ floors: updatedFloors });
      if (!get().currentFloor) set({ currentFloor: newFloor.id });
    } catch (e) {
      console.error('Failed to add floor', e);
      get().addToast('Failed to add floor. Please try again.', 'error');
    }
  },

  editFloor: async (id, level, name, imageUrl) => {
    const { floors } = get();
    const oldFloor = floors.find(f => f.id === id);
    const imageChanged = imageUrl && imageUrl !== oldFloor?.image;
    
    const updatedFloors = floors.map(f => f.id === id ? { ...f, level, name, image: imageUrl } : f);

    const payloadFloors = updatedFloors.map(f => ({
      ...f,
      image: f.id === id ? (imageChanged ? imageUrl : '__KEEP__') : '__KEEP__'
    }));

    try {
      const res = await fetch('/api/save-floors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(get().token ? { 'Authorization': `Bearer ${get().token}` } : {})
        },
        body: JSON.stringify({ floors: payloadFloors, buildingId: get().currentBuilding || 'bldg_default' })
      });
      if (!res.ok) throw new Error('Failed to update floor on API');
      set({ floors: updatedFloors });
    } catch (e) {
      console.error('Failed to edit floor', e);
      get().addToast('Failed to update floor. Please try again.', 'error');
    }
  },

  updateFloorsOrder: async (orderedFloors) => {
    const payloadFloors = orderedFloors.map(f => ({
      ...f,
      image: '__KEEP__'
    }));

    try {
      const res = await fetch('/api/save-floors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(get().token ? { 'Authorization': `Bearer ${get().token}` } : {})
        },
        body: JSON.stringify({ floors: payloadFloors, buildingId: get().currentBuilding || 'bldg_default' })
      });
      if (!res.ok) throw new Error('Failed to update floor order on API');
      set({ floors: orderedFloors });
    } catch (e) {
      console.error('Failed to update floor order', e);
      get().addToast('Failed to update floor order.', 'error');
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

    const payloadFloors = updatedFloors.map(f => ({
      ...f,
      image: '__KEEP__'
    }));

    try {
      const res = await fetch('/api/save-floors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(get().token ? { 'Authorization': `Bearer ${get().token}` } : {})
        },
        body: JSON.stringify({ floors: payloadFloors, buildingId: get().currentBuilding || 'bldg_default' })
      });
      if (!res.ok) throw new Error('Failed to delete floor from API');
      set({ floors: updatedFloors, nodes: updatedNodes, edges: updatedEdges, pois: computePoisFromNodes(updatedNodes), currentFloor: nextFloor });
      saveGraph(updatedNodes, updatedEdges);
    } catch (e) {
      console.error('Failed to delete floor', e);
      get().addToast('Failed to delete floor. Please try again.', 'error');
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
