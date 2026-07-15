import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { FiUploadCloud, FiTrash2, FiPlus, FiEdit3, FiSave, FiX, FiLayers, FiChevronDown } from 'react-icons/fi';

export default function FloorManager() {
  const { floors, addFloor, editFloor, deleteFloor, buildings, currentBuilding, setBuilding, addBuilding, editBuilding, addToast } = useMapStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [isEditingBuilding, setIsEditingBuilding] = useState(false);
  const [editBuildingName, setEditBuildingName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [floorToDelete, setFloorToDelete] = useState(null);
  const [buildingToDelete, setBuildingToDelete] = useState(null);
  const [activeSelect, setActiveSelect] = useState(null);
  
  // Form States
  const [level, setLevel] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  // File upload handler
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    // Send file as FormData for multer
    const formData = new FormData();
    formData.append('map', file);

    try {
      const res = await fetch('/api/upload-floor-map', {
        method: 'POST',
        headers: {
          ...(useMapStore.getState().token ? { 'Authorization': `Bearer ${useMapStore.getState().token}` } : {})
        },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
        } else {
          addToast('Upload failed. Please try again.', 'error');
        }
      } catch (err) {
        console.error(err);
        addToast('Error uploading blueprint.', 'error');
      } finally {
        setUploading(false);
      }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!level || !name || !imageUrl) {
      addToast('Please fill out all fields and upload a blueprint image.', 'error');
      return;
    }

    if (editingId) {
      await editFloor(editingId, level, name, imageUrl);
      setEditingId(null);
    } else {
      await addFloor(level, name, imageUrl);
      setIsAdding(false);
    }

    // Reset fields
    setLevel('');
    setName('');
    setImageUrl('');
    setPreview(null);
  };

  const handleStartEdit = (floor) => {
    setEditingId(floor.id);
    setLevel(floor.level);
    setName(floor.name);
    setImageUrl(floor.image);
    setPreview(floor.image);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setLevel('');
    setName('');
    setImageUrl('');
    setPreview(null);
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* ── BUILDING MANAGER ── */}
      <div className="flex flex-col gap-2 p-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Building</label>
          <button 
            onClick={() => setIsAddingBuilding(!isAddingBuilding)}
            className="text-sky-500 hover:text-sky-600 font-bold flex items-center gap-1 cursor-pointer"
          >
            {isAddingBuilding ? <FiX className="w-3 h-3" /> : <FiPlus className="w-3 h-3" />}
            {isAddingBuilding ? 'Cancel' : 'New'}
          </button>
        </div>

        {isAddingBuilding ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Terminal 2"
              value={newBuildingName}
              onChange={(e) => setNewBuildingName(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 text-[16px]"
            />
            <button
              onClick={() => {
                if(newBuildingName.trim()){
                  addBuilding(newBuildingName.trim(), '');
                  setNewBuildingName('');
                  setIsAddingBuilding(false);
                }
              }}
              className="bg-sky-500 text-white px-3 rounded-lg font-bold hover:bg-sky-600 cursor-pointer"
            >
              Add
            </button>
          </div>
        ) : isEditingBuilding ? (
          <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.15)] relative transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiEdit3 className="w-3 h-3" /> Rename Building
              </span>
              <button onClick={() => setIsEditingBuilding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-full active:scale-90 transition-all">
                <FiX className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={editBuildingName}
                onChange={(e) => setEditBuildingName(e.target.value)}
                autoFocus
                placeholder="Terminal Name"
                className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-[14px] font-black text-slate-800 dark:text-white transition-all shadow-inner"
              />
              <button
                onClick={() => {
                  if(editBuildingName.trim()){
                    editBuilding(currentBuilding, editBuildingName.trim());
                    setIsEditingBuilding(false);
                  }
                }}
                className="bg-sky-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-sky-600 cursor-pointer active:scale-95 transition-all flex flex-shrink-0 items-center justify-center gap-2 shadow-md shadow-sky-500/20"
              >
                <FiSave className="w-4 h-4" /> <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-sm relative hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
            {buildings.length > 1 && (
              <select 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                value={currentBuilding || ''}
                onChange={(e) => setBuilding(e.target.value)}
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.id} className="text-slate-800">{b.name}</option>
                ))}
              </select>
            )}
            
            <div className="flex flex-col flex-1 relative pointer-events-none pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-slate-800 dark:text-slate-100">
                  {buildings.find(b => b.id === currentBuilding)?.name || 'Unknown Building'}
                </span>
                {buildings.length > 1 && <FiChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">{floors.length} Floors Active</span>
            </div>
            
            <div className="flex items-center gap-1 relative z-20 pointer-events-auto">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const bName = buildings.find(b => b.id === currentBuilding)?.name;
                  setEditBuildingName(bName || '');
                  setIsEditingBuilding(true);
                }} 
                className="p-2 text-slate-400 hover:text-sky-500 bg-slate-50 hover:bg-sky-50 dark:bg-slate-900 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer" 
                title="Edit Building Name"
              >
                <FiEdit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setBuildingToDelete(buildings.find(b => b.id === currentBuilding)); 
                }} 
                className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" 
                title="Delete Building"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── FLOOR MANAGER ── */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/40 pb-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <FiLayers className="w-4 h-4 text-sky-500" />
          Floors in Active Building
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold transition-all shadow-md shadow-sky-500/10 cursor-pointer"
          >
            <FiPlus className="w-3.5 h-3.5" />
            Add Floor
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="flex flex-col gap-3.5 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-md">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {editingId ? 'Edit Floor' : 'Create New Floor'}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Code</label>
              <input
                type="text"
                placeholder="L5"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:text-white text-[16px]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Floor Name</label>
              <input
                type="text"
                placeholder="Roof Lounge"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:text-white text-[16px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Map Blueprint Image</label>
            <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 rounded-xl p-4 transition-colors cursor-pointer bg-white dark:bg-slate-950/40">
              {preview ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40">
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="text-white text-xs font-bold bg-slate-900/80 px-2 py-1 rounded-md">Change Map</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4">
                  <FiUploadCloud className="w-8 h-8 text-slate-400 group-hover:text-sky-500 transition-colors" />
                  <span className="font-bold text-slate-600 dark:text-slate-400">Click to upload image</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG or SVG blueprints</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingId}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 flex items-center justify-center rounded-xl">
                  <span className="font-bold text-sky-500 animate-pulse">Uploading map...</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/10"
          >
            <FiSave className="w-4 h-4" />
            {editingId ? 'Update Blueprint' : 'Add Floor Blueprint'}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Floor Levels</span>
        {floors.map((floor) => (
          <div
            key={floor.id}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/40 bg-white/50 dark:bg-slate-950/20 hover:border-slate-300 dark:hover:border-slate-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-extrabold font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300">
                {floor.level}
              </span>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{floor.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">{floor.image}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStartEdit(floor)}
                className="p-2 rounded-lg text-slate-450 hover:text-sky-500 hover:bg-sky-500/10 dark:hover:bg-sky-500/20 transition-all cursor-pointer"
                title="Edit Floor"
              >
                <FiEdit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFloorToDelete(floor)}
                className="p-2 rounded-lg text-slate-450 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
                title="Delete Floor"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {floorToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 text-lg shadow-inner">
                <FiTrash2 className="w-5 h-5 animate-pulse" />
              </div>
              
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-105 tracking-wide">
                  Delete Floor Blueprint?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                  Are you sure you want to delete <strong className="text-slate-700 dark:text-slate-200">"{floorToDelete.name}"</strong>? All map data and Points of Interest on this floor level will be permanently erased.
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setFloorToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteFloor(floorToDelete.id);
                    setFloorToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-colors active:scale-95 shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Delete Floor
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {buildingToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 text-lg shadow-inner">
                <FiTrash2 className="w-5 h-5 animate-pulse" />
              </div>
              
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-105 tracking-wide">
                  Delete Entire Building?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                  Are you sure you want to delete <strong className="text-slate-700 dark:text-slate-200">"{buildingToDelete.name}"</strong>? This will permanently delete ALL floors, map data, and Points of Interest associated with this building! This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setBuildingToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await useMapStore.getState().deleteBuilding(buildingToDelete.id);
                    setBuildingToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-colors active:scale-95 shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Delete Building
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
