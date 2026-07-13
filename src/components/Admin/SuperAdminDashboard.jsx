import React, { useState, useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { FiPlus, FiLogOut, FiUsers, FiBox, FiActivity, FiMap, FiMapPin, FiTrash2, FiPower, FiX, FiAlertTriangle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { token, logout, addToast } = useMapStore();
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({ total_clients: 0, total_projects: 0, total_floors: 0, total_pois: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('Airport');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, clientsRes] = await Promise.all([
        fetch('/api/superadmin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/superadmin/list-clients', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (statsRes.ok && clientsRes.ok) {
        setStats(await statsRes.json());
        setClients(await clientsRes.json());
      } else if (statsRes.status === 401 || clientsRes.status === 401 || statsRes.status === 403 || clientsRes.status === 403) {
        logout();
        navigate('/login');
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      fetchData();
    }
  }, [token, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/superadmin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username, password, project_id: projectId, project_name: projectName, project_type: projectType })
      });
      if (res.ok) {
        addToast('Client Created Successfully!', 'success');
        setShowCreateModal(false);
        setUsername(''); setPassword(''); setProjectId(''); setProjectName(''); setProjectType('Airport');
        fetchData();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to create client', 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  // For toggle status confirmation
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [clientToToggle, setClientToToggle] = useState(null);

  const confirmToggleStatus = (client) => {
    setClientToToggle(client);
    setShowStatusModal(true);
  };

  const executeToggleStatus = async () => {
    if (!clientToToggle) return;
    const newStatus = clientToToggle.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/superadmin/client/${clientToToggle.user_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
        addToast(`Client status changed to ${newStatus}`, 'success');
      } else {
        addToast('Failed to change status', 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setShowStatusModal(false);
      setClientToToggle(null);
    }
  };

  const confirmDeleteClient = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const res = await fetch(`/api/superadmin/client/${clientToDelete.user_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShowDeleteModal(false);
        setClientToDelete(null);
        fetchData();
        addToast('Client and all their data deleted.', 'success');
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to delete client', 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 p-4 md:p-8 text-white relative flex flex-col items-center overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-sky-900/20 to-transparent pointer-events-none" />
      
      <div className="w-full max-w-6xl relative z-10 flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
          <div>
            <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">SaaS Control Center</h1>
            <p className="text-slate-400 text-sm">Super Admin Dashboard</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            {/* Profile Indicator */}
            <div className="flex items-center gap-3 pr-4 md:border-r border-slate-800 hidden md:flex">
              <div className="w-10 h-10 bg-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center font-bold text-lg border border-sky-500/30">
                {useMapStore.getState().user?.username?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">@{useMapStore.getState().user?.username || 'admin'}</span>
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-black">SuperAdmin</span>
              </div>
            </div>

            <button onClick={() => setShowCreateModal(true)} className="w-full md:w-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition shadow-lg shadow-sky-500/20">
              <FiPlus /> New Client
            </button>
            <button onClick={handleLogout} className="w-full md:w-auto px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold flex justify-center items-center gap-2 transition">
              <FiLogOut /> Sign Out
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<FiUsers />} label="Total Clients" value={stats.total_clients} color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20" />
          <StatCard icon={<FiBox />} label="Map Projects" value={stats.total_projects} color="text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20" />
          <StatCard icon={<FiMap />} label="Total Floors" value={stats.total_floors} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
          <StatCard icon={<FiMapPin />} label="Total POIs" value={stats.total_pois} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
        </div>

        {/* Client List */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2"><FiActivity className="text-sky-500" /> Active Deployments</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Client / Project</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Project ID</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Created</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading data...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500">No clients found. Create one to get started!</td></tr>
                ) : clients.map(c => (
                  <tr key={c.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-200">{c.project_name || 'Unnamed Project'}</div>
                      <div className="text-xs text-slate-500">@{c.username}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{c.project_id}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${c.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => confirmToggleStatus(c)} title={c.status === 'active' ? 'Disable Access' : 'Enable Access'} className={`p-2 rounded-lg border transition ${c.status === 'active' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}>
                          <FiPower />
                        </button>
                        <button onClick={() => confirmDeleteClient(c)} title="Delete Project & User" className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><FiX size={24}/></button>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><FiUsers className="text-sky-500" /> Provision New Client</h2>
              
              <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Project ID (e.g. jfk_airport)</label>
                  <input required type="text" value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-sky-500 outline-none" placeholder="No spaces, lowercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Public App Name</label>
                  <input required type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-sky-500 outline-none" placeholder="e.g. JFK Navigator" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Admin Username</label>
                    <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-sky-500 outline-none" placeholder="client_jfk" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Password</label>
                    <input required type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-sky-500 outline-none" placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Industry / Project Type</label>
                  <select value={projectType} onChange={e => setProjectType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-sky-500 outline-none appearance-none">
                    <option value="Airport">Airport</option>
                    <option value="Hospital">Hospital</option>
                    <option value="Mall">Mall</option>
                    <option value="Metro">Metro</option>
                    <option value="Exhibition">Exhibition</option>
                    <option value="University">University</option>
                    <option value="Generic">Generic / Other</option>
                  </select>
                </div>
                <button type="submit" disabled={creating} className="w-full mt-4 bg-sky-500 hover:bg-sky-400 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 shadow-lg shadow-sky-500/20">
                  <FiPlus /> {creating ? 'Provisioning...' : 'Deploy Project & Account'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && clientToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-4 text-3xl">
                <FiAlertTriangle />
              </div>
              <h2 className="text-xl font-bold mb-2">Delete Project & Client?</h2>
              <p className="text-sm text-slate-400 mb-6">
                You are about to permanently delete <strong className="text-white">{clientToDelete.project_name}</strong> (@{clientToDelete.username}). 
                This will destroy all their map data, floors, POIs, and routes. <strong>This cannot be undone!</strong>
              </p>
              
              <div className="flex gap-4">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition">
                  Cancel
                </button>
                <button onClick={handleDeleteClient} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition flex justify-center items-center gap-2">
                  <FiTrash2 /> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Status Toggle Modal */}
        {showStatusModal && clientToToggle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl relative text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl ${clientToToggle.status === 'active' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'}`}>
                <FiPower />
              </div>
              <h2 className="text-xl font-bold mb-2">
                {clientToToggle.status === 'active' ? 'Disable Access?' : 'Enable Access?'}
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Are you sure you want to {clientToToggle.status === 'active' ? 'disable' : 'enable'} access for <strong className="text-white">{clientToToggle.username}</strong>?
              </p>
              
              <div className="flex gap-4">
                <button onClick={() => setShowStatusModal(false)} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition">
                  Cancel
                </button>
                <button onClick={executeToggleStatus} className={`flex-1 py-3 rounded-xl text-white font-bold transition flex justify-center items-center gap-2 ${clientToToggle.status === 'active' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                  <FiCheck /> Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const StatCard = ({ icon, label, value, color, bg, border }) => (
  <div className={`p-6 rounded-3xl border ${border} ${bg} backdrop-blur flex flex-col items-start gap-4 transition hover:scale-[1.02]`}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${color} bg-white/5`}>
      {icon}
    </div>
    <div>
      <div className={`text-4xl font-black ${color}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{label}</div>
    </div>
  </div>
);
