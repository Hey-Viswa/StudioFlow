import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { getProjectFiles, getFileDetails, deleteFile, archiveFile, restoreFile, getFilePreviewUrl, formatFileSize, getFileIcon } from '@/lib/api/files';
import { useProjectSocket } from '@/hooks/useSocket';
import { hasPermission, PERMISSIONS, ROLES, getPermissionErrorMessage, canViewFile, canDownloadFile } from '@/utils/rbac';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileUploadDropzone } from './FileUploadDropzone';
import { ShareFileDialog } from './ShareFileDialog';
import { ManageSharedFilesDialog } from './ManageSharedFilesDialog';
import { toast } from 'sonner';
import { Download, MoreVertical, Trash2, Eye, History, RefreshCw, Archive, ArchiveRestore, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ProjectFilesPanel Component
 * Displays and manages files for a project with real-time updates
 */
export function ProjectFilesPanel({ projectId, project }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, fileId: null, filename: '', type: 'archive' });
  const [shareDialog, setShareDialog] = useState({ open: false, fileId: null, filename: '' });
  const [manageDialog, setManageDialog] = useState({ open: false, file: null });
  
  // Get user's role in the project
  const userRole = project?.userRole || ROLES.CLIENT;
  const isOwner = userRole === ROLES.OWNER;

  // Real-time updates via Socket.IO
  useProjectSocket(projectId, {
    onFileAdded: (data) => {
      console.log('📁 File added:', data);
      setFiles((prev) => [data.file, ...prev]);
      toast.success('New file added to project');
    },
    onFileDeleted: (data) => {
      console.log('🗑️ File deleted:', data);
      setFiles((prev) => prev.filter((f) => f.fileId !== data.fileId));
    },
  });

  // Fetch files on mount
  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await getProjectFiles(projectId, token, {
        includeArchived: true, // Fetch all files including archived
      });
      setFiles(response.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    fetchFiles();
  };

  const handleDelete = async (fileId, filename) => {
    // RBAC: Only owner can delete files
    if (!hasPermission(userRole, PERMISSIONS.FILE_DELETE)) {
      toast.error(getPermissionErrorMessage(PERMISSIONS.FILE_DELETE));
      return;
    }
    setDeleteDialog({ open: true, fileId, filename, type: 'archive' });
  };

  const confirmDelete = async () => {
    const { fileId, filename } = deleteDialog;
    
    try {
      const token = await getToken();
      await archiveFile(projectId, fileId, token);
      setFiles((prev) => prev.map(f => f.fileId === fileId ? { ...f, status: 'archived' } : f));
      toast.success(`"${filename}" moved to trash`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error(error.message || 'Failed to delete file');
    } finally {
      setDeleteDialog({ open: false, fileId: null, filename: '', type: 'archive' });
    }
  };

  const handleRestore = async (fileId, filename) => {
    // RBAC: Only owner can restore files
    if (!hasPermission(userRole, PERMISSIONS.FILE_DELETE)) {
      toast.error(getPermissionErrorMessage(PERMISSIONS.FILE_DELETE));
      return;
    }
    
    try {
      const token = await getToken();
      await restoreFile(projectId, fileId, token);
      setFiles((prev) => prev.map(f => f.fileId === fileId ? { ...f, status: 'active' } : f));
      toast.success(`"${filename}" restored successfully`);
    } catch (error) {
      console.error('Failed to restore file:', error);
      toast.error(error.message || 'Failed to restore file');
    }
  };

  const handleDownload = async (fileId, filename) => {
    // RBAC: Check download permission
    const file = files.find(f => f.fileId === fileId);
    if (!canDownloadFile(file, user?.id, userRole)) {
      if (userRole === ROLES.CLIENT) {
        toast.error('This file has not been shared with you, or download permission has not been granted');
      } else {
        toast.error('You do not have permission to download this file');
      }
      return;
    }
    
    try {
      const token = await getToken();
      const response = await getFileDetails(projectId, fileId, token);
      const link = document.createElement('a');
      link.href = response.downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error(error.message || 'Failed to download file');
    }
  };

  const handlePreview = async (fileId, filename) => {
    try {
      const token = await getToken();
      const response = await getFilePreviewUrl(projectId, fileId, token);
      window.open(response.previewUrl, '_blank');
    } catch (error) {
      console.error('Failed to preview file:', error);
      toast.error(error.message || 'Failed to preview file');
    }
  };

  const handleShare = (fileId, filename) => {
    // RBAC: Only owner can share files
    if (!hasPermission(userRole, PERMISSIONS.FILE_SHARE)) {
      toast.error(getPermissionErrorMessage(PERMISSIONS.FILE_SHARE));
      return;
    }
    setShareDialog({ open: true, fileId, filename });
  };

  const handleManageSharing = (file) => {
    // RBAC: Only owner can manage file sharing
    if (!hasPermission(userRole, PERMISSIONS.FILE_MANAGE_SHARING)) {
      toast.error(getPermissionErrorMessage(PERMISSIONS.FILE_MANAGE_SHARING));
      return;
    }
    setManageDialog({ open: true, file });
  };

  const handleShareComplete = () => {
    fetchFiles(); // Refresh to get updated share info
  };

  const filteredFiles = files.filter((file) => {
    // RBAC: Clients can only see files shared with them
    if (userRole === ROLES.CLIENT && !canViewFile(file, user?.id, userRole)) {
      return false;
    }
    
    // Filter out archived files unless specifically viewing archived tab
    if (activeTab !== 'archived' && file.status === 'archived') return false;
    if (activeTab === 'archived') return file.status === 'archived';
    if (activeTab === 'all') return file.status === 'active';
    if (activeTab === 'images') return file.status === 'active' && file.mimeType.startsWith('image/');
    if (activeTab === 'videos') return file.status === 'active' && file.mimeType.startsWith('video/');
    if (activeTab === 'documents') return file.status === 'active' && (file.mimeType.includes('pdf') || file.mimeType.includes('document'));
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Upload Area - Owner Only */}
      {isOwner && (
        <FileUploadDropzone
          projectId={projectId}
          onUploadComplete={handleUploadComplete}
          maxSize={500 * 1024 * 1024}
          multiple
        />
      )}

      {/* Files List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Project Files</CardTitle>
            <CardDescription>
              {files.length} {files.length === 1 ? 'file' : 'files'} uploaded
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFiles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Files</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="archived">Trash</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <FileListSkeleton />
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {activeTab === 'archived' ? 'Trash is empty' : 'No files yet. Upload your first file above!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map((file) => (
                    <FileItem
                      key={file.fileId}
                      file={file}
                      userRole={userRole}
                      userId={user?.id}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                      onDownload={handleDownload}
                      onPreview={handlePreview}
                      onShare={handleShare}
                      onManageSharing={handleManageSharing}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete File?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{deleteDialog.filename}</strong>"?
              <br />
              The file will be moved to trash and can be restored within 90 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share File Dialog */}
      <ShareFileDialog
        open={shareDialog.open}
        onOpenChange={(open) => setShareDialog({ ...shareDialog, open })}
        projectId={projectId}
        fileId={shareDialog.fileId}
        filename={shareDialog.filename}
        onShareComplete={handleShareComplete}
      />

      {/* Manage Shared Files Dialog */}
      <ManageSharedFilesDialog
        open={manageDialog.open}
        onOpenChange={(open) => setManageDialog({ ...manageDialog, open })}
        projectId={projectId}
        file={manageDialog.file}
      />
    </div>
  );
}

/**
 * Individual file item
 */
function FileItem({ file, userRole, userId, onDelete, onRestore, onDownload, onPreview, onShare, onManageSharing }) {
  const isPreviewable = file.mimeType.startsWith('image/') || 
                        file.mimeType.startsWith('video/') || 
                        file.mimeType === 'application/pdf';
  const isArchived = file.status === 'archived';
  const isShared = file.sharedWith && file.sharedWith.length > 0;
  const isOwner = userRole === ROLES.OWNER;
  const canDownload = canDownloadFile(file, userId, userRole);
  const canView = canViewFile(file, userId, userRole);

  return (
    <Card className={cn("p-4 hover:bg-muted/50 transition-colors", isArchived && "opacity-60 bg-muted/30")}>
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 text-3xl">{getFileIcon(file.mimeType)}</div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{file.filename}</p>
            {isArchived && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Deleted</span>
            )}
            {isShared && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                Shared
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            {file.version > 1 && (
              <span className="inline-flex items-center gap-1">
                <History className="w-3 h-3" />
                v{file.version}
              </span>
            )}
            <span>
              {new Date(file.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isArchived ? (
              <>
                {/* Preview - Available to all if file type supports it and user can view */}
                {isPreviewable && canView && (
                  <DropdownMenuItem onClick={() => onPreview(file.fileId, file.filename)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                )}
                
                {/* Download - Only if explicitly allowed */}
                {canDownload && (
                  <DropdownMenuItem onClick={() => onDownload(file.fileId, file.filename)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
                
                {/* Owner-only actions */}
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onShare(file.fileId, file.filename)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share with Client
                    </DropdownMenuItem>
                    {isShared && (
                      <DropdownMenuItem onClick={() => onManageSharing(file)}>
                        <Users className="w-4 h-4 mr-2" />
                        Manage Sharing
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(file.fileId, file.filename)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Restore - Owner only */}
                {isOwner && (
                  <DropdownMenuItem onClick={() => onRestore(file.fileId, file.filename)}>
                    <ArchiveRestore className="w-4 h-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

/**
 * Loading skeleton
 */
function FileListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </Card>
      ))}
    </div>
  );
}
