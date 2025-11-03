import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

const Trash = () => {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/projects/trash`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch trash');
      }

      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (projectId) => {
    try {
      setActionLoading(projectId);
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/projects/${projectId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to restore project');
      }

      // Remove from trash list
      setProjects(projects.filter(p => p._id !== projectId));
    } catch (err) {
      alert('Failed to restore: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (projectId) => {
    try {
      setActionLoading(projectId);
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/projects/${projectId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to permanently delete project');
      }

      // Remove from trash list
      setProjects(projects.filter(p => p._id !== projectId));
      setConfirmDelete(null);
      setConfirmInput('');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteConfirm = (project) => {
    setConfirmDelete(project);
    setConfirmInput('');
  };

  const closeDeleteConfirm = () => {
    setConfirmDelete(null);
    setConfirmInput('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading trash...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Trash2 className="w-8 h-8" />
          Trash
        </h1>
        <p className="text-gray-600">
          Deleted projects are stored here for 30 days before being permanently removed.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Trash2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Trash is empty</h3>
              <p className="text-gray-500">Deleted projects will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project._id} className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {project.title}
                      <Badge variant="destructive" className="ml-2">
                        {project.daysRemaining} days left
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {project.brief || 'No description'}
                    </CardDescription>
                    <p className="text-sm text-gray-500 mt-2">
                      Deleted on {new Date(project.deletedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(project._id)}
                      disabled={actionLoading === project._id}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteConfirm(project)}
                      disabled={actionLoading === project._id}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Forever
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-red-500 border-2">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 mt-1" />
                <div>
                  <CardTitle className="text-red-600">Delete Project Permanently</CardTitle>
                  <CardDescription className="mt-2">
                    This action <strong>cannot be undone</strong>. This will permanently delete the project{' '}
                    <strong>{confirmDelete.title}</strong> and all its data.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Please type <strong>{confirmDelete.title}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Type project name"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={closeDeleteConfirm}
                  disabled={actionLoading === confirmDelete._id}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handlePermanentDelete(confirmDelete._id)}
                  disabled={confirmInput !== confirmDelete.title || actionLoading === confirmDelete._id}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {actionLoading === confirmDelete._id ? 'Deleting...' : 'Delete Permanently'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Trash;
