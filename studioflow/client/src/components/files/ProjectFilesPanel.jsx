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
import { Checkbox } from '@/components/ui/checkbox';
import { FileUploadDropzone } from './FileUploadDropzone';
import { ShareFileDialog } from './ShareFileDialog';
import { ManageSharedFilesDialog } from './ManageSharedFilesDialog';
import ShowcasePublishModal from '@/components/showcase/ShowcasePublishModal';
import { toast } from 'sonner';
import { Download, MoreVertical, Trash2, Eye, History, RefreshCw, Archive, ArchiveRestore, Share2, Users, Lock, CreditCard, Globe, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import useRazorpay from '@/hooks/useRazorpay';
import api from '@/lib/api';

import { useUploads } from '@/context/UploadContext';

/**
 * ProjectFilesPanel Component
 * Displays and manages files for a project with real-time updates
 */
export function ProjectFilesPanel({ projectId, project }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { displayRazorpay } = useRazorpay();
  const { startUpload } = useUploads(); // Get startUpload from context
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, fileId: null, filename: '', type: 'archive' });
  const [shareDialog, setShareDialog] = useState({ open: false, fileId: null, fileIds: [], filename: '' });
  const [manageDialog, setManageDialog] = useState({ open: false, file: null });
  const [showcaseDialog, setShowcaseDialog] = useState({ open: false, file: null });
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [processingPayment, setProcessingPayment] = useState(null); // invoiceId being paid
  const versionInputRef = React.useRef(null);
  const [versionTargetFile, setVersionTargetFile] = useState(null);

  // Get user's role in the project
  const rawRole = project?.userRole || ROLES.CLIENT;
  const userRole = rawRole === 'member' || rawRole === 'teammate' ? ROLES.TEAM : rawRole;
  const isOwner = userRole === ROLES.OWNER;
  const isTeam = userRole === ROLES.TEAM;
  const canManageFiles = isOwner || isTeam;

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
    onFileUpdated: (data) => {
      console.log('🔄 File updated:', data);
      setFiles((prev) => prev.map((f) => {
        if (f.fileId === data.fileId) {
          return { ...f, ...data };
        }
        return f;
      }));

      // Update dialog if open
      setManageDialog((prev) => {
        if (prev.open && prev.file?.fileId === data.fileId) {
          return { ...prev, file: { ...prev.file, ...data } };
        }
        return prev;
      });
    },
  });

  // Fetch files on mount
  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  // Reset selection on tab change
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [activeTab]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await getProjectFiles(projectId, token, {
        includeArchived: true, // Fetch all files including archived
        category: 'deliverable', // Only show deliverables
      });
      setFiles(response.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      // If user is a client, it's possible they just don't have access to any files yet
      // or the RBAC is stricter than expected. We should show an empty state instead of an error.
      if (userRole === ROLES.CLIENT) {
        setFiles([]);
      } else {
        toast.error('Failed to load files');
      }
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

  const toggleSelection = (fileId) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = filteredFiles.map(f => f.fileId);
      setSelectedFiles(new Set(allIds));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleBulkShare = () => {
    if (selectedFiles.size === 0) return;
    setShareDialog({
      open: true,
      fileIds: Array.from(selectedFiles),
      filename: `${selectedFiles.size} files`
    });
  };

  const handleManageSharingUpdate = (updatedFile) => {
    // Update local state consistently
    setFiles(prev => prev.map(f => f.fileId === updatedFile.fileId ? {
      ...f,
      sharedWith: updatedFile.sharedWith
    } : f));
  };

  const handleShareComplete = () => {
    fetchFiles();
    setSelectedFiles(new Set());
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

  const handlePayment = async (invoiceId, invoiceNumber) => {
    if (!invoiceId) return;

    setProcessingPayment(invoiceId);
    try {
      // 1. Create Order
      const orderResponse = await api.post(`/invoices/project/${invoiceId}/pay`, {}, { getToken });

      // 2. Open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'StudioFlow',
        description: `Payment for Invoice #${invoiceNumber}`,
        order_id: orderResponse.orderId,
        handler: async (response) => {
          try {
            // 3. Verify Payment
            await api.post(`/invoices/project/${invoiceId}/verify`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }, { getToken });

            toast.success('Payment successful! File unlocked.');
            // Refresh files to update status
            fetchFiles();
          } catch (err) {
            console.error('Verification error:', err);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleApproval = async (file, status, comment = '') => {
    try {
      // We need a task ID to approve. 
      // Current logic assumes specific tasks are linked to files.
      // BUT, we might want to approve the FILE itself directly, which then updates the task?
      // For now, let's assume we are approving the file status on the file itself, 
      // and we need a backend endpoint to handle "File Approval" which updates tasks.

      // Actually, based on the plan, we should be using the Task Controller's submitReview if a task exists.
      // But looking at the UI, we are on the File Panel. 
      // Let's implement a direct file approval endpoint in fileController or just update the file status?
      // The robust way: Create/Find a review task for this file and update it.
      // SIMPLER WAY FOR MVP: Update File `approvalStatus` directly via new endpoint, 
      // and have the backend find the linked task to update.

      await api.post(`/projects/${projectId}/files/${file.fileId}/approval`, {
        status,
        comment
      }, { getToken });

      toast.success(status === 'approved' ? 'File Approved' : 'Changes Requested');
      fetchFiles();
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Failed to update approval status');
    }
  };

  const allSelected = filteredFiles.length > 0 && Array.from(selectedFiles).length >= filteredFiles.length;

  const handleShowcaseConfig = (file) => {
    // Check if approved? Maybe stricter UI check later.
    setShowcaseDialog({ open: true, file });
  };

  const handleVersionUpload = (file) => {
    setVersionTargetFile(file);
    if (versionInputRef.current) {
        versionInputRef.current.click();
    }
  };

  const handleVersionFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !versionTargetFile) return;

    // Reset input
    e.target.value = '';

    startUpload(file, projectId, {
        isNewVersion: true,
        baseFileId: versionTargetFile.fileId,
        onComplete: () => {
            fetchFiles();
            toast.success('New version uploaded');
        },
        onError: (err) => {
            toast.error(`Failed to upload version: ${err.message}`);
        }
    });

    setVersionTargetFile(null);
  };

  return (
    <div className="space-y-6">
       {/* Hidden Input for Version Upload */}
       <input 
            type="file" 
            ref={versionInputRef} 
            className="hidden" 
            onChange={handleVersionFileSelect} 
       />
      {/* Upload Area - Owner Only */}
      {canManageFiles && (
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
          <div className="flex items-center gap-4">
            <div>
              <CardTitle>Project Files</CardTitle>
              <CardDescription>
                {files.length} {files.length === 1 ? 'file' : 'files'} uploaded
              </CardDescription>
            </div>
            {canManageFiles && selectedFiles.size > 0 && (
              <Button onClick={handleBulkShare} size="sm" variant="secondary">
                <Share2 className="w-4 h-4 mr-2" />
                Share {selectedFiles.size} selected
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchFiles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All Files</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="archived">Trash</TabsTrigger>
            </TabsList>

            {canManageFiles && filteredFiles.length > 0 && activeTab !== 'archived' && (
              <div className="flex items-center gap-2 mb-4 px-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            )}

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
                      canManageFiles={canManageFiles}
                      canDeleteFiles={isOwner}
                      isSelected={selectedFiles.has(file.fileId)}
                      onSelect={() => toggleSelection(file.fileId)}
                      onPay={handlePayment}
                      onApprove={handleApproval}
                      processingPayment={processingPayment}
                      onShowcase={handleShowcaseConfig}
                      onUploadVersion={(file) => handleVersionUpload(file)}
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
        fileIds={shareDialog.fileIds}
        filename={shareDialog.filename}
        onShareComplete={handleShareComplete}
      />

      {/* Manage Shared Files Dialog */}
      <ManageSharedFilesDialog
        open={manageDialog.open}
        onOpenChange={(open) => setManageDialog({ ...manageDialog, open })}
        projectId={projectId}
        file={manageDialog.file}
        onUpdate={handleManageSharingUpdate}
      />
      
      {/* Showcase Publish Dialog */}
      <ShowcasePublishModal
        isOpen={showcaseDialog.open}
        onClose={() => setShowcaseDialog({ ...showcaseDialog, open: false })}
        file={showcaseDialog.file}
      />
    </div>
  );
}

/**
 * Individual file item
 */
function FileItem({ file, userRole, userId, onDelete, onRestore, onDownload, onPreview, onShare, onManageSharing, onPay, onApprove, processingPayment, onShowcase, onUploadVersion, canManageFiles, canDeleteFiles, isSelected, onSelect }) {
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = useState(false);
  const isPreviewable = file.mimeType.startsWith('image/') ||
    ['video/mp4', 'video/webm', 'video/ogg'].includes(file.mimeType) ||
    file.mimeType === 'application/pdf';
  const isArchived = file.status === 'archived';
  const isShared = file.sharedWith && file.sharedWith.length > 0;
  // If gatedInvoice exists and is NOT paid, it is considered locked for the client
  const isLocked = userRole === ROLES.CLIENT && !file.canDownload && file.gatedInvoice && file.gatedInvoice.status !== 'paid';

  const canDownload = canDownloadFile(file, userId, userRole) && !isLocked;
  const canView = canViewFile(file, userId, userRole);

  const canPreviewAction = !isArchived && isPreviewable && canView && !isLocked;
  const canDownloadAction = !isArchived && canDownload;
  const canShareAction = !isArchived && canManageFiles;
  const canManageShareAction = !isArchived && canManageFiles && isShared;
  const canDeleteAction = !isArchived && canDeleteFiles;
  const canRestoreAction = isArchived && canManageFiles;
  const canPayAction = isLocked && onPay;

  // Prioritize Pay action if locked
  const hasAnyAction = canPreviewAction || canDownloadAction || canShareAction || canManageShareAction || canDeleteAction || canRestoreAction || canPayAction;

  // Approval Logic
  const canApprove = userRole === ROLES.CLIENT || userRole === ROLES.OWNER; // Owners can also self-approve or override
  const approvalStatus = file.approvalStatus || 'draft';
  const isPendingReview = approvalStatus === 'pending_review';

  return (
    <Card className={cn("p-4 hover:bg-muted/50 transition-colors", isArchived && "opacity-60 bg-muted/30", isPendingReview && "border-amber-400 bg-amber-50/30")}>
      <div className="flex items-center gap-4">
        {/* Checkbox for owner */}
        {canManageFiles && !isArchived && (
          <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={(e) => e.stopPropagation()} />
        )}

        {/* Icon or Thumbnail */}
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-muted rounded overflow-hidden relative">
          {/* Approval Badge Overlay */}
          {approvalStatus === 'approved' && (
            <div className="absolute top-0 right-0 p-0.5 bg-green-500 rounded-bl-md z-10">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          )}

          {!thumbnailLoadFailed && file.previewUrl && (file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/')) ? (
            file.mimeType.startsWith('video/') ? (
              <video 
                src={`${file.previewUrl}#t=0.1`} 
                className="w-full h-full object-cover" 
                preload="metadata"
                muted
                playsInline
                onError={() => setThumbnailLoadFailed(true)}
                onMouseOver={e => e.target.play().catch(() => {})}
                onMouseOut={e => { e.target.pause(); e.target.currentTime = 0.1; }}
              />
            ) : (
              <img
                src={file.previewUrl}
                alt={file.filename}
                className="w-full h-full object-cover"
                onError={() => setThumbnailLoadFailed(true)}
              />
            )
          ) : (
            <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{file.filename}</p>
            {/* Status Badges */}
            {isArchived && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Deleted</span>}
            {isShared && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1"><Share2 className="w-3 h-3" /> Shared</span>}
            {/* Version Badge - always show if it exists */}
            {file.version > 1 && (
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 font-mono">
                    v{file.version}
                </span>
            )}

            {/* Approval Status Badge */}
            {approvalStatus === 'pending_review' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">In Review</span>}
            {approvalStatus === 'changes_requested' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">Changes Requested</span>}
            {approvalStatus === 'approved' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Approved</span>}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{formatFileSize(file.size)}</span>
            <span>
              {new Date(file.createdAt).toLocaleDateString()}
            </span>

            {/* PAY BUTTON */}
            {isLocked && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 ml-2"
                disabled={processingPayment === file.gatedInvoice._id}
                onClick={() => onPay(file.gatedInvoice._id, file.gatedInvoice.invoiceNumber)}
              >
                {processingPayment === file.gatedInvoice._id ? <span className="animate-spin mr-1">⌛</span> : <CreditCard className="w-3 h-3 mr-1" />}
                Pay {file.gatedInvoice.currency} {file.gatedInvoice.total} to Unlock
              </Button>
            )}

            {/* APPROVE BUTTONS (Client Only, Pending Review) */}
            {canApprove && approvalStatus === 'pending_review' && !isArchived && (
              <div className="flex items-center gap-2 ml-2">
                <Button size="sm" variant="outline" className="h-7 text-xs border-green-500 text-green-600 hover:bg-green-50" onClick={() => onApprove(file, 'approved')}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => onApprove(file, 'changes_requested')}>
                  Request Changes
                </Button>
              </div>
            )}
          </div>
        </div>


        {/* Actions */}
        {hasAnyAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="ml-auto">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isArchived ? (
                <>
                  {/* Preview - Available if file type supports it and user can view */}
                  {canPreviewAction && (
                    <DropdownMenuItem onClick={() => onPreview(file.fileId, file.filename)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                  )}

                  {/* Download - Only if explicitly allowed */}
                  {canDownloadAction && (
                    <DropdownMenuItem onClick={() => onDownload(file.fileId, file.filename)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                  )}

                  {/* Share/manage - owners and teammates */}
                  {canShareAction && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onShare(file.fileId, file.filename)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share with Client
                      </DropdownMenuItem>
                      {/* SHOWCASE -- Owner Only */}
                      {canDeleteFiles && (
                         <DropdownMenuItem onClick={() => onShowcase(file)}>
                            <Globe className="w-4 h-4 mr-2" />
                            Add to Showcase
                         </DropdownMenuItem>
                      )}
                      {canManageShareAction && (
                        <DropdownMenuItem onClick={() => onManageSharing(file)}>
                          <Users className="w-4 h-4 mr-2" />
                          Manage Sharing
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {/* Delete - owner only */}
                  {canDeleteAction && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onUploadVersion(file)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New Version
                      </DropdownMenuItem>
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
                  {/* Restore - owner + teammates */}
                  {canRestoreAction && (
                    <DropdownMenuItem onClick={() => onRestore(file.fileId, file.filename)}>
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Restore
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

    </Card >
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
