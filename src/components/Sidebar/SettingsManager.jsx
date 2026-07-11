import React, { useState } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { FiSave, FiUpload, FiImage, FiSettings } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function SettingsManager() {
  const navigate = useNavigate();
  const { appSettings, token, logout, user, addToast } = useMapStore();
  const [name, setName] = useState(appSettings?.name || '');
  const [logoUrl, setLogoUrl] = useState(appSettings?.logo_url || '');
  const [publicSlug, setPublicSlug] = useState(appSettings?.public_slug || '');
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) setLogoUrl(data.url);
    } catch (err) {
      console.error('Failed to upload logo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/save-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name, logo_url: logoUrl, public_slug: publicSlug })
      });
      if (res.ok) {
        useMapStore.setState({ appSettings: { name, logo_url: logoUrl, public_slug: publicSlug } });
        addToast('Settings saved successfully!', 'success');
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      addToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    const slugToUse = appSettings?.public_slug || user?.project_id || 'default';
    const url = `${window.location.origin}/map/${slugToUse}`;
    navigator.clipboard.writeText(url);
    addToast('Public Map Link copied to clipboard!', 'success');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/30">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
          <FiSettings /> App Branding
        </h3>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">App Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[16px] text-slate-800 dark:text-slate-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
              placeholder="e.g. Chennai Airport Navigation"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Custom Map URL (Slug)</label>
            <input
              type="text"
              value={publicSlug}
              onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[16px] text-slate-800 dark:text-slate-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
              placeholder="e.g. apollo_hosp"
            />
            <p className="text-[10px] text-slate-400 mt-1.5">No spaces. Use lowercase letters, numbers, hyphens, and underscores.</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">App Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <FiImage className="text-2xl text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition">
                  <FiUpload /> {uploading ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
                <p className="text-[10px] text-slate-400 mt-1.5">Square aspect ratio recommended. (PNG/JPG)</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full mt-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <FiSave /> {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-2">Share Map</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
          This is the public link for your map. Share it with your users.
        </p>
        <button
          onClick={handleCopyLink}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition"
        >
          Copy Public URL
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold py-3 rounded-2xl border border-red-200 dark:border-red-500/20 text-sm transition"
      >
        Sign Out
      </button>
    </div>
  );
}
