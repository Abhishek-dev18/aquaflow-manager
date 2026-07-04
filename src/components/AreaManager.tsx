import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Save, X, CheckCircle } from 'lucide-react';
import { Area } from '../types';
import { getAreas, saveArea, deleteArea } from '../services/db';

const AreaManager: React.FC = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const loadAreas = async () => {
    const areasData = await getAreas();
    setAreas(areasData || []);
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      await saveArea({ name: newName.trim() });
      setNewName('');
      await loadAreas();
      showToast(`Area "${newName.trim()}" added`);
    }
  };

  const startEdit = (area: Area) => {
    setIsEditing(area.id || '');
    setEditName(area.name);
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setEditName('');
  };

  const handleUpdate = async (id: string) => {
    if (editName.trim()) {
      await saveArea({ id, name: editName.trim() });
      setIsEditing(null);
      await loadAreas();
      showToast('Area updated');
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteArea(deleteConfirm);
      setDeleteConfirm(null);
      await loadAreas();
      showToast('Area deleted');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 z-50">
          <CheckCircle size={18}/> {toast}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="text-brand-600" /> Area Management
          </h1>
          <p className="text-gray-500 mt-1">Define the areas where you supply water. These will appear in the customer dropdown.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Add Area Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-100 h-fit">
          <h2 className="font-semibold text-gray-800 mb-4 border-b border-brand-50 pb-2">Add New Area</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Area Name</label>
              <input 
                type="text" 
                placeholder="e.g., North Extension" 
                className="w-full rounded-lg border-gray-300 bg-white shadow-sm border p-2.5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={!newName.trim()}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Plus size={18} /> Add Area
            </button>
          </form>
        </div>

        {/* Area List */}
        <div className="md:col-span-2 space-y-3">
          {areas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <MapPin className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500">No areas defined yet. Add one to get started.</p>
            </div>
          ) : (
            areas.map(area => (
              <div key={area.id} className="group bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between hover:border-brand-300 transition-colors">
                {isEditing === area.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      type="text" 
                      className="flex-1 border-brand-300 rounded-md focus:ring-brand-500 focus:border-brand-500 border p-2 outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(area.id)} className="p-2 text-green-600 hover:bg-green-50 rounded"><Save size={18} /></button>
                    <button onClick={cancelEdit} className="p-2 text-gray-400 hover:bg-gray-100 rounded"><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm border border-brand-100">
                        {area.name.substring(0,2).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">{area.name}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(area)} className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit Name">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(area.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Area">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3 rounded-t-3xl">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Delete Area</h2>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-gray-700 leading-relaxed">
                This will remove the area from the selection list. Existing customers will keep the old area name until manually updated.
              </p>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                onClick={cancelDelete}
                className="px-4 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaManager;