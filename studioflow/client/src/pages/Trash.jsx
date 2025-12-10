import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  AlertTriangle,
  FileText,
  FolderOpen,
  File
} from 'lucide-react';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export default function Trash() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'projects', 'invoices', 'files'

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      console.log('Fetching trash from:', `${apiUrl}/trash/all`);

      const response = await fetch(`${apiUrl}/trash/all`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Trash response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Trash fetch error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch trash items');
      }

      const data = await response.json();
      console.log('Trash data received:', data);
      console.log('Files in trash:', data.items?.filter(i => i.type === 'file'));
      setTrashItems(data.items || []);
    } catch (error) {
      console.error('Error fetching trash:', error);
      toast.error(`Failed to load trash: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    setActionLoading(item._id);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      console.log('🔄 Restoring item:', { type: item.type, id: item._id, projectId: item.projectId, fileId: item.fileId });

      let endpoint;
      if (item.type === 'invoice') {
        endpoint = `/trash/invoices/${item._id}/restore`;
      } else if (item.type === 'file') {
        // Files need project ID and file ID
        endpoint = `/projects/${item.projectId}/files/${item.fileId}/restore`;
      } else {
        endpoint = `/trash/projects/${item._id}/restore`;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Restore failed:', errorData);
        throw new Error(errorData.error || `Failed to restore ${item.type}`);
      }

      console.log('✅ Item restored successfully');

      const itemName = item.type === 'invoice' ? 'Invoice' : item.type === 'file' ? 'File' : 'Project';
      toast.success(`${itemName} restored successfully`);
      fetchTrashItems();
    } catch (error) {
      console.error('Error restoring item:', error);
      toast.error(`Failed to restore ${item.type}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (item) => {
    setActionLoading(item._id);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      console.log('🗑️ Permanently deleting item:', { type: item.type, id: item._id, projectId: item.projectId, fileId: item.fileId });

      let endpoint;
      if (item.type === 'invoice') {
        endpoint = `/trash/invoices/${item._id}`;
      } else if (item.type === 'file') {
        // Files need project ID and file ID
        endpoint = `/projects/${item.projectId}/files/${item.fileId}`;
      } else {
        endpoint = `/trash/projects/${item._id}`;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to permanently delete ${item.type}`);
      }

      const itemName = item.type === 'invoice' ? 'Invoice' : item.type === 'file' ? 'File' : 'Project';
      toast.success(`${itemName} permanently deleted`);
      fetchTrashItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(`Failed to delete ${item.type}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const filteredItems = filter === 'all'
    ? trashItems
    : trashItems.filter(item => {
      if (filter === 'projects') return item.type === 'project';
      if (filter === 'invoices') return item.type === 'invoice';
      if (filter === 'files') return item.type === 'file';
      return true;
    });

  if (loading) {
    return <DashboardSkeleton />;
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
            Items will be permanently deleted after 30 days
          </p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="w-full justify-start md:justify-center">
            <TabsTrigger value="all" className="flex-shrink-0">All ({trashItems.length})</TabsTrigger>
            <TabsTrigger value="projects" className="flex-shrink-0">
              <FolderOpen className="w-4 h-4 mr-2" />
              Projects ({trashItems.filter(i => i.type === 'project').length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-shrink-0">
              <FileText className="w-4 h-4 mr-2" />
              Invoices ({trashItems.filter(i => i.type === 'invoice').length})
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-shrink-0">
              <File className="w-4 h-4 mr-2" />
              Files ({trashItems.filter(i => i.type === 'file').length})
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trash2 className="w-20 h-20 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Trash is empty</h3>
          <p className="text-muted-foreground max-w-md">
            Deleted {filter === 'all' ? 'items' : filter} will appear here and be automatically removed after 30 days.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-card-foreground">Type</TableHead>
                  <TableHead className="text-card-foreground">Name</TableHead>
                  <TableHead className="text-card-foreground">Status</TableHead>
                  <TableHead className="text-card-foreground">Deleted By</TableHead>
                  <TableHead className="text-card-foreground">Deleted On</TableHead>
                  <TableHead className="text-card-foreground">Days Left</TableHead>
                  <TableHead className="text-right text-card-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item._id} className="hover:bg-muted/50">
                    <TableCell>
                      {item.type === 'project' ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <FolderOpen className="w-3 h-3 mr-1" />
                          Project
                        </Badge>
                      ) : item.type === 'invoice' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <FileText className="w-3 h-3 mr-1" />
                          Invoice
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          <File className="w-3 h-3 mr-1" />
                          File
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-card-foreground">
                          {item.type === 'project' ? item.title :
                            item.type === 'invoice' ? item.invoiceNumber :
                              item.filename}
                        </p>
                        {item.type === 'project' && item.brief && (
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {item.brief}
                          </p>
                        )}
                        {item.type === 'invoice' && (
                          <p className="text-sm text-muted-foreground">
                            {item.projectTitle} • {formatINR(item.total)}
                          </p>
                        )}
                        {item.type === 'file' && (
                          <p className="text-sm text-muted-foreground">
                            {(item.size / 1024 / 1024).toFixed(2)} MB • {item.mimeType}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      {item.deletedByName || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      {formatDate(item.deletedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-card-foreground">{item.daysRemaining} days</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(item)}
                          disabled={actionLoading === item._id}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Restore"
                        >
                          {actionLoading === item._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === item._id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-card-foreground">Permanently Delete?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                This will permanently delete {
                                  item.type === 'project' ? `project "${item.title}"` :
                                    item.type === 'invoice' ? `invoice "${item.invoiceNumber}"` :
                                      `file "${item.filename}"`
                                }.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handlePermanentDelete(item)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Permanently
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {filteredItems.map((item) => (
              <div key={item._id} className="bg-card border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {item.type === 'project' ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        <FolderOpen className="w-3 h-3 mr-1" />
                        Project
                      </Badge>
                    ) : item.type === 'invoice' ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <FileText className="w-3 h-3 mr-1" />
                        Invoice
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                        <File className="w-3 h-3 mr-1" />
                        File
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(item.deletedAt)}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                </div>

                <div>
                  <p className="font-medium text-card-foreground">
                    {item.type === 'project' ? item.title :
                      item.type === 'invoice' ? item.invoiceNumber :
                        item.filename}
                  </p>
                  {item.type === 'project' && item.brief && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {item.brief}
                    </p>
                  )}
                  {item.type === 'invoice' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.projectTitle} • {formatINR(item.total)}
                    </p>
                  )}
                  {item.type === 'file' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(item.size / 1024 / 1024).toFixed(2)} MB • {item.mimeType}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{item.daysRemaining} days left</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      disabled={actionLoading === item._id}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      {actionLoading === item._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === item._id}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-card-foreground">Permanently Delete?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            This will permanently delete this item. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handlePermanentDelete(item)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
