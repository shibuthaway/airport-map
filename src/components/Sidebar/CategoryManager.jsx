import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiSave, FiX, FiCheck, FiLoader, FiAlertTriangle } from 'react-icons/fi';
import * as LucideIcons from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import SearchableSelect from './SearchableSelect';

const AVAILABLE_ICONS = [
  'Plane', 'Briefcase', 'Shield', 'ShoppingBag', 'Coffee', 'Droplet', 'Stethoscope', 
  'AlertTriangle', 'Bed', 'Pill', 'Pizza', 'TrendingUp', 'Car', 'Train', 'Ticket', 
  'LogOut', 'Layout', 'Store', 'BookOpen', 'FlaskConical', 'Library', 'Building', 
  'DoorOpen', 'Star', 'ChevronsUp', 'MapPin', 'Wine', 'Banknote', 'Archive', 
  'Navigation', 'ArrowUp', 'ArrowDown', 'Info', 'Users', 'Camera', 'Video', 'Utensils'
];

export default function CategoryManager() {
  const { categories: storeCategories, token, loadMapData, currentBuilding, addToast } = useMapStore();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [activeSelectIndex, setActiveSelectIndex] = useState(null);

  useEffect(() => {
    // Clone categories for local editing
    setCategories(JSON.parse(JSON.stringify(storeCategories || [])));
  }, [storeCategories]);

  const handleAddCategory = () => {
    const newCat = {
      id: `c_custom_${Date.now()}`,
      name: 'New Category',
      icon: 'MapPin',
      color: '#3b82f6',
      sort_order: categories.length
    };
    setCategories([...categories, newCat]);
  };

  const handleUpdate = (index, field, value) => {
    const updated = [...categories];
    updated[index][field] = value;
    setCategories(updated);
  };

  const handleDelete = (index) => {
    setCategoryToDelete(index);
  };

  const confirmDelete = () => {
    if (categoryToDelete === null) return;
    const updated = categories.filter((_, i) => i !== categoryToDelete);
    setCategories(updated);
    setCategoryToDelete(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/save-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categories)
      });
      
      if (res.ok) {
        addToast('Categories saved successfully!', 'success');
        loadMapData(); // Refresh to update store and POIs
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to save categories', 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const DynamicIcon = ({ name, className }) => {
    const IconCmp = LucideIcons[name] || LucideIcons.HelpCircle;
    return <IconCmp className={className} />;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-indigo-500"><DynamicIcon name="Layout" className="w-4 h-4"/></span> Category Manager
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Manage POI Types & Icons</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        >
          {saving ? <FiLoader className="animate-spin" /> : <FiSave />} {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
        <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
        
        {categories.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            No categories defined yet.
          </div>
        )}

        {categories.map((cat, index) => (
          <motion.div
            key={cat.id || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Icon Preview */}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                style={{ backgroundColor: cat.color || '#3b82f6' }}
              >
                <DynamicIcon name={cat.icon} className="w-5 h-5" />
              </div>

              {/* Category Name */}
              <div className="flex-1">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="Category Name"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(index)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Color Picker (Native) */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Color</span>
                <input 
                  type="color" 
                  value={cat.color || '#3b82f6'} 
                  onChange={(e) => handleUpdate(index, 'color', e.target.value)}
                  className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              
              {/* Icon Selector */}
              <div className="flex items-center gap-2 flex-1 relative z-10">
                <SearchableSelect
                  placeholder="Select icon..."
                  options={AVAILABLE_ICONS.map(iconName => ({ value: iconName, label: iconName }))}
                  value={cat.icon}
                  onChange={(val) => handleUpdate(index, 'icon', val)}
                  isControlledOpen={activeSelectIndex === index}
                  onOpen={() => setActiveSelectIndex(index)}
                  onClose={() => setActiveSelectIndex(null)}
                />
              </div>
            </div>
          </motion.div>
        ))}

        <button
          onClick={handleAddCategory}
          className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors font-semibold text-sm"
        >
          <FiPlus /> Add New Category
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {categoryToDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto mb-3 text-2xl">
                <FiAlertTriangle />
              </div>
              <h2 className="text-lg font-bold mb-2 text-white">Remove Category?</h2>
              <p className="text-xs text-slate-400 mb-6">
                Any POIs using this category will remain, but they will lose their icon until reassigned.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setCategoryToDelete(null)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition flex justify-center items-center gap-2">
                  <FiTrash2 /> Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
