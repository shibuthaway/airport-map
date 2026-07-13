import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import {
  FiMapPin, FiToggleLeft, FiToggleRight, FiPlus, FiEdit2,
  FiTrash2, FiDownload, FiRefreshCw, FiCheck, FiX, FiTag, FiUploadCloud,
  FiLink, FiAlertTriangle, FiClock, FiShield, FiUnlock,
} from 'react-icons/fi';



const STATUSES = ['Open', 'Closed', 'Under Maintenance', 'Coming Soon'];

const emptyForm = { name: '', category: 'gate', description: '', status: 'Open', imageFile: null, imagePreview: null, imageUrl: null };

export default function TaggingPanel() {
  const {
    currentFloor, pois, selectedPoi, selectPoi,
    taggingMode, taggingCoords, editingPoiId,
    setTaggingMode, setTaggingCoords, setEditingPoiId,
    addPoi, editPoi, deletePoi, exportFloorData, resetToDefaults,
    nodes, edges, isDrawingEdges, setIsDrawingEdges, selectedEdge, setSelectedEdge, updateEdge,
    blockEdge, unblockEdge, categories,
  } = useMapStore();

  const [form, setForm] = useState(emptyForm);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  // Block Path form state
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('');
  const [blockConfirmed, setBlockConfirmed] = useState(false);

  // Reset block form when edge changes
  useEffect(() => {
    setBlockReason(selectedEdge?.blockReason || '');
    setBlockDuration(selectedEdge?.blockDuration || '');
    setBlockConfirmed(false);
  }, [selectedEdge?.id]);

  const editingPoi = editingPoiId
    ? (pois[currentFloor] || []).find(p => p.id === editingPoiId)
    : null;

  // Populate form when editing an existing POI
  useEffect(() => {
    if (editingPoi) {
      setForm({
        name: editingPoi.name || '',
        category: editingPoi.category || (categories?.[0]?.id || 'default'),
        description: editingPoi.description || '',
        status: editingPoi.status || 'Open',
        imageUrl: editingPoi.imageUrl || null,
        imagePreview: editingPoi.imageUrl || null,
        imageFile: null,
      });
    } else {
      setForm({ ...emptyForm, category: categories?.[0]?.id || 'default' });
    }
  }, [editingPoiId, categories]);

  // When user selects a custom POI, offer to edit it
  useEffect(() => {
    if (selectedPoi && selectedPoi.floor === currentFloor && selectedPoi.isCustom && taggingMode) {
      setEditingPoiId(selectedPoi.id);
      setTaggingCoords({ x: selectedPoi.x, y: selectedPoi.y });
    }
  }, [selectedPoi?.id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, imageFile: file, imagePreview: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    let uploadedImageUrl = form.imageUrl;

    if (form.imagePreview && form.imageFile) {
      try {
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: form.imageFile.name,
            base64: form.imagePreview
          })
        });
        const data = await response.json();
        if (data.url) uploadedImageUrl = data.url;
      } catch (err) {
        console.error('Image upload failed', err);
      }
    }

    if (editingPoiId) {
      // Editing existing POI
      editPoi(currentFloor, editingPoiId, {
        name: form.name,
        category: form.category,
        description: form.description,
        status: form.status,
        imageUrl: uploadedImageUrl,
        ...(taggingCoords ? { x: taggingCoords.x, y: taggingCoords.y } : {}),
      });
      setEditingPoiId(null);
    } else {
      // Adding new POI — coords required
      if (!taggingCoords) return;
      addPoi(currentFloor, { ...form, imageUrl: uploadedImageUrl, x: taggingCoords.x, y: taggingCoords.y });
    }
    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    if (!editingPoiId) return;
    deletePoi(currentFloor, editingPoiId);
    setEditingPoiId(null);
    setTaggingCoords(null);
    setForm({ ...emptyForm, category: categories?.[0]?.id || 'default' });
  };

  const handleCancelEdit = () => {
    setEditingPoiId(null);
    setTaggingCoords(null);
    setForm({ ...emptyForm, category: categories?.[0]?.id || 'default' });
  };

  const customPoisOnFloor = (pois[currentFloor] || []).filter(p => p.isCustom);
  const totalCustom = Object.values(pois).flat().filter(p => p.isCustom).length;

  const floorLabel = {
    departure: 'L2 Departure', arrival: 'L1 Arrival',
    mezzanine: 'L3 Mezzanine', lounge: 'L4 Lounge',
  }[currentFloor] || currentFloor;

  return (
    <motion.div
      key="tagging"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex flex-col gap-5"
    >
      {/* ── Tagging Mode Toggle ── */}
      <div className={`flex items-center justify-between p-3 rounded-2xl border transition ${
        taggingMode
          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300/50 dark:border-amber-700/40'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/30'
      }`}>
        <div className="flex items-center gap-2">
          <FiTag className={`w-4 h-4 ${taggingMode ? 'text-amber-500' : 'text-slate-400'}`} />
          <div>
            <p className={`text-sm font-semibold ${taggingMode ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
              Tagging Mode
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {taggingMode ? 'Click on map to drop a pin' : 'Enable to place tags on map'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setTaggingMode(!taggingMode)}
          className={`text-2xl transition-colors ${taggingMode ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
          aria-label="Toggle Tagging Mode"
        >
          {taggingMode ? <FiToggleRight className="w-7 h-7" /> : <FiToggleLeft className="w-7 h-7" />}
        </button>
      </div>

      {/* ── Edge Drawing Mode Toggle ── */}
      <div className={`flex items-center justify-between p-3 rounded-2xl border transition ${
        isDrawingEdges
          ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300/50 dark:border-indigo-700/40'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/30'
      }`}>
        <div className="flex items-center gap-2">
          <FiLink className={`w-4 h-4 ${isDrawingEdges ? 'text-indigo-500' : 'text-slate-400'}`} />
          <div>
            <p className={`text-sm font-semibold ${isDrawingEdges ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
              Edge Mode
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {isDrawingEdges ? 'Click two nodes to connect' : 'Enable to link map nodes'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            const nextVal = !isDrawingEdges;
            setIsDrawingEdges(nextVal);
            if (nextVal) {
              useMapStore.setState({ taggingMode: false, taggingCoords: null, editingPoiId: null });
            }
          }}
          className={`text-2xl transition-colors ${isDrawingEdges ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`}
          aria-label="Toggle Edge Mode"
        >
          {isDrawingEdges ? <FiToggleRight className="w-7 h-7" /> : <FiToggleLeft className="w-7 h-7" />}
        </button>
      </div>


      {/* ── Coordinate Display ── */}
      <AnimatePresence>
        {taggingMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-mono ${
              taggingCoords
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300/40 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/30 dark:border-slate-800/30 text-slate-400 dark:text-slate-500'
            }`}>
              <FiMapPin className="w-4 h-4 flex-shrink-0" />
              {taggingCoords
                ? <span>x: <strong>{taggingCoords.x}</strong> &nbsp; y: <strong>{taggingCoords.y}</strong></span>
                : <span className="italic">No pin placed yet...</span>
              }
              {taggingCoords && (
                <button
                  onClick={() => { setTaggingCoords(null); handleCancelEdit(); }}
                  className="ml-auto text-slate-400 hover:text-rose-500 transition"
                  title="Clear pin"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tag Form (shown when tagging and coords set, or editing) ── */}
      <AnimatePresence>
        {(taggingCoords || editingPoiId) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                {editingPoiId ? <FiEdit2 className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}
                {editingPoiId ? 'Edit Tag' : 'New Tag'}
              </h4>
              {editingPoiId && (
                <button onClick={handleCancelEdit} className="text-slate-400 hover:text-rose-500 transition">
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Starbucks Coffee"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                {categories && categories.length > 0 ? categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="default">Default</option>}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Photo / Logo</label>
              <div className="flex items-center gap-3">
                {(form.imagePreview || form.imageUrl) && (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <img src={form.imagePreview || form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 cursor-pointer transition text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <FiUploadCloud className="w-4 h-4 text-slate-400" />
                  {form.imageFile ? <span className="truncate max-w-[120px]">{form.imageFile.name}</span> : 'Upload Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
                      form.status === s
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || (!taggingCoords && !editingPoiId)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition active:scale-95"
              >
                {saved ? <FiCheck className="w-4 h-4" /> : (editingPoiId ? <FiEdit2 className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />)}
                {saved ? 'Saved!' : editingPoiId ? 'Update' : 'Save Tag'}
              </button>
              {editingPoiId && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-800/40 text-rose-500 transition active:scale-95"
                  title="Delete this tag"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Selected Edge Details ── */}
      {selectedEdge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="rounded-2xl overflow-hidden border shadow-lg"
          style={{
            borderColor: selectedEdge.blocked ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.3)',
            background: selectedEdge.blocked
              ? 'linear-gradient(135deg, rgba(254,242,242,0.8), rgba(255,255,255,0.9))'
              : 'linear-gradient(135deg, rgba(238,242,255,0.8), rgba(255,255,255,0.9))',
          }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 ${selectedEdge.blocked ? 'bg-red-500' : 'bg-indigo-600'}`}>
            <div className="flex items-center gap-2">
              {selectedEdge.blocked
                ? <FiAlertTriangle className="w-4 h-4 text-white animate-pulse" />
                : <FiLink className="w-4 h-4 text-white" />
              }
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {selectedEdge.blocked ? '🚧 Path Blocked' : 'Path Connection'}
              </span>
            </div>
            <button onClick={() => setSelectedEdge(null)} className="text-white/70 hover:text-white transition">
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Route Info */}
            <div className="bg-white/60 dark:bg-slate-900/30 rounded-xl p-3 space-y-1.5 border border-slate-100 dark:border-slate-800/30">
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 flex-shrink-0 text-[9px] font-black">A</span>
                <span className="font-semibold truncate">{nodes.find(n => n.id === selectedEdge.from)?.name || 'Point A'}</span>
              </div>
              <div className="w-px h-3 border-l-2 border-dashed border-slate-300 dark:border-slate-700 ml-2.5" />
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 flex-shrink-0 text-[9px] font-black">B</span>
                <span className="font-semibold truncate">{nodes.find(n => n.id === selectedEdge.to)?.name || 'Point B'}</span>
              </div>
              <div className="flex items-center gap-3 pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/20">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  📏 Distance:
                  <input
                    type="number"
                    value={selectedEdge.distance}
                    onChange={(e) => updateEdge(selectedEdge.id, { distance: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                  m
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedEdge.bidirectional !== false ? '↔ Two-way' : '→ One-way'}
                </span>
              </div>
            </div>

            {/* Blocked Status Badge */}
            <AnimatePresence mode="wait">
              {selectedEdge.blocked ? (
                <motion.div
                  key="blocked"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚧</span>
                    <div>
                      <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wide">Path is Blocked</p>
                      {selectedEdge.blockReason && (
                        <p className="text-[10px] text-red-500/70 dark:text-red-400/60">
                          Reason: <strong>{selectedEdge.blockReason}</strong>
                        </p>
                      )}
                      {selectedEdge.blockDuration && (
                        <p className="text-[10px] text-red-500/70 dark:text-red-400/60 flex items-center gap-1">
                          <FiClock className="w-2.5 h-2.5" /> Until: {selectedEdge.blockDuration}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-red-400/70 dark:text-red-500/50 flex items-center gap-1">
                    <FiShield className="w-2.5 h-2.5" /> Navigation automatically avoids this path
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="open"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-3 py-2 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Path is Open — included in navigation routes</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Block Path Form (shown when not blocked) */}
            <AnimatePresence>
              {!selectedEdge.blocked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Block This Path</p>

                    {/* Reason */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Reason *</label>
                      <select
                        value={blockReason}
                        onChange={e => setBlockReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-400/40"
                      >
                        <option value="">Select reason...</option>
                        <option value="🚧 Under Construction">🚧 Under Construction</option>
                        <option value="🔧 Maintenance Work">🔧 Maintenance Work</option>
                        <option value="🚨 Emergency Closure">🚨 Emergency Closure</option>
                        <option value="🌊 Flooding / Water">🌊 Flooding / Water</option>
                        <option value="🔥 Fire Safety Drill">🔥 Fire Safety Drill</option>
                        <option value="🎖️ VIP Security">🎖️ VIP Security</option>
                        <option value="⚡ Power Outage">⚡ Power Outage</option>
                        <option value="📦 Cargo Blockage">📦 Cargo Blockage</option>
                        <option value="🧹 Cleaning">🧹 Cleaning</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <FiClock className="inline w-2.5 h-2.5 mr-1" />Expected Until (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={blockDuration}
                        onChange={e => setBlockDuration(e.target.value)}
                        style={{ colorScheme: 'dark light' }}
                        className="w-full min-w-0 max-w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[11px] focus:outline-none focus:ring-2 focus:ring-red-400/40"
                      />
                    </div>

                    {/* Block Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={!blockReason}
                      onClick={() => {
                        blockEdge(selectedEdge.id, blockReason, blockDuration);
                        setBlockConfirmed(true);
                        setTimeout(() => setBlockConfirmed(false), 2000);
                      }}
                      className={`w-full py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                        !blockReason
                          ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                          : blockConfirmed
                            ? 'bg-emerald-500'
                            : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                      }`}
                    >
                      {blockConfirmed
                        ? <><FiCheck className="w-3.5 h-3.5" /> Blocked!</>
                        : <><FiAlertTriangle className="w-3.5 h-3.5" /> Block This Path</>
                      }
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unblock Button (shown when blocked) */}
            <AnimatePresence>
              {selectedEdge.blocked && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => unblockEdge(selectedEdge.id)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2"
                >
                  <FiUnlock className="w-3.5 h-3.5" /> Unblock — Reopen Path
                </motion.button>
              )}
            </AnimatePresence>

            {/* Divider */}
            <div className="border-t border-slate-200/50 dark:border-slate-800/30" />

            {/* Wheelchair + Delete Row */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedEdge.accessible !== false}
                  onChange={(e) => updateEdge(selectedEdge.id, { accessible: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                ♿ Wheelchair Accessible
              </label>
              <button
                onClick={() => {
                  useMapStore.getState().deleteEdge(selectedEdge.id);
                  setSelectedEdge(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200/50 dark:border-rose-800/30 text-rose-500 text-[10px] font-bold transition"
                title="Delete this connection"
              >
                <FiTrash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Custom Tags on Current Floor ── */}
      {customPoisOnFloor.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
            <span>Tagged on {floorLabel}</span>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{customPoisOnFloor.length}</span>
          </h3>
          <div className="flex flex-col gap-1.5">
            {customPoisOnFloor.map(poi => (
              <button
                key={poi.id}
                onClick={() => {
                  selectPoi(poi);
                  setTaggingMode(true);
                  setEditingPoiId(poi.id);
                  setTaggingCoords({ x: poi.x, y: poi.y });
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-amber-50 dark:hover:bg-amber-950/10 border border-slate-200/30 dark:border-slate-800/30 hover:border-amber-300/40 transition text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{poi.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {poi.category} · ({poi.x}, {poi.y})
                  </p>
                </div>
                <FiEdit2 className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Export / Data Actions ── */}
      <div className="border-t border-slate-200/20 dark:border-slate-800/30 pt-4 flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
          Data Actions
        </h3>

        {/* Export current floor */}
        <button
          onClick={() => exportFloorData(currentFloor)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-sky-50 dark:hover:bg-sky-950/20 border border-slate-200/30 dark:border-slate-800/30 hover:border-sky-300/40 transition text-left group"
        >
          <FiDownload className="w-4 h-4 text-sky-500" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Export {floorLabel}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{(pois[currentFloor] || []).length} POIs → {currentFloor}.json</p>
          </div>
        </button>

        {/* Export all floors */}
        <button
          onClick={() => {
            ['departure', 'arrival', 'mezzanine', 'lounge'].forEach(f => exportFloorData(f));
          }}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-200/30 dark:border-slate-800/30 hover:border-indigo-300/40 transition text-left"
        >
          <FiDownload className="w-4 h-4 text-indigo-500" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Export All Floors</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {totalCustom} custom tag{totalCustom !== 1 ? 's' : ''} total
            </p>
          </div>
        </button>

        {/* Reset to defaults */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200/30 dark:border-slate-800/30 hover:border-rose-300/40 transition text-left"
        >
          <FiRefreshCw className="w-4 h-4 text-rose-500" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Reset to Defaults</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Remove all custom tags</p>
          </div>
        </button>

        {/* Reset confirmation */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/40"
            >
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mb-2">
                ⚠️ This will remove all {totalCustom} custom tags. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { resetToDefaults(); setShowResetConfirm(false); }}
                  className="flex-1 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
