import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Trash2,
  Loader2,
  RotateCcw,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

export default function Trash() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [trashedProjects, setTrashedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchTrashedProjects();
  }, []);

  const fetchTrashedProjects = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/trash`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trashed projects');
      }

      const data = await response.json();
      setTrashedProjects(data);
    } catch (error) {
      console.error('Fetch trash error:', error);
      toast.error('Failed to load trashed projects');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (trashId) => {
    setActionLoading(trashId);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/trash/${trashId}/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore project');
      }

      const data = await response.json();
      toast.success('Project restored successfully!');
      
      setTrashedProjects(prev => prev.filter(p => p._id !== trashId));
      
      setTimeout(() => {
        navigate(`/dashboard/projects/${data.project._id}`);
      }, 1000);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (trashId) => {
    setActionLoading(trashId);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/trash/${trashId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete project permanently');
      }

      toast.success('Project permanently deleted');
      setTrashedProjects(prev => prev.filter(p => p._id !== trashId));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete project');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmptyTrash = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/trash`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      });

      if (!response.ok) {
        throw new Error('Failed to empty trash');
      }

      const data = await response.json();
      toast.success(`Trash emptied: ${data.deletedCount} project(s) deleted`);
      setTrashedProjects([]);
    } catch (error) {
      console.error('Empty trash error:', error);
      toast.error('Failed to empty trash');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trash2 className="w-8 h-8" />
            Trash
          </h1>
          <p className="text-muted-foreground mt-1">
            Projects will be permanently deleted after 30 days
          </p>
        </div>

        {trashedProjects.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Empty Trash
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {trashedProjects.length} project(s) in trash.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEmptyTrash}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Empty Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {trashedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trash2 className="w-20 h-20 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Trash is empty</h3>
          <p className="text-muted-foreground max-w-md">
            Deleted projects will appear here and be automatically removed after 30 days.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => navigate('/dashboard/projects')}
          >
            Back to Projects
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deleted By</TableHead>
                <TableHead>Deleted On</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trashedProjects.map((project) => (
                <TableRow key={project._id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{project.title}</span>
                      {project.brief && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {project.brief}
                        </span>
                      )}
                      {project.deleteReason && (
                        <span className="text-xs text-muted-foreground italic">
                          Reason: {project.deleteReason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {project.deletedByName || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(project.deletedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-sm font-medium ${
                        project.daysRemaining <= 7 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {project.daysRemaining} {project.daysRemaining === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(project._id)}
                        disabled={actionLoading === project._id}
                      >
                        {actionLoading === project._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Restore
                          </>
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={actionLoading === project._id}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                              Permanently Delete Project?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete "{project.title}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(project._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Forever
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
