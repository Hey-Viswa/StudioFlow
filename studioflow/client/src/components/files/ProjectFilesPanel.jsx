import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getProjectFiles, getFileDetails, deleteFile, formatFileSize, getFileIcon } from '@/lib/api/files';
import { useProjectSocket } from '@/hooks/useSocket';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileUploadDropzone } from './FileUploadDropzone';
import { toast } from 'sonner';
import { Download, MoreVertical, Trash2, Eye, History, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ProjectFilesPanel Component
 * Displays and manages files for a project with real-time updates
 */
export function ProjectFilesPanel({ projectId }) {
  const { getToken } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

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
        status: 'active',
        includeArchived: false,
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
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
      const token = await getToken();
      await deleteFile(projectId, fileId, token);
      setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleDownload = async (fileId, filename) => {
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
      toast.error('Failed to download file');
    }
  };

  const handlePreview = async (fileId, filename) => {
    try {
      const token = await getToken();
      const response = await getFileDetails(projectId, fileId, token);
      window.open(response.downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to preview file:', error);
      toast.error('Failed to preview file');
    }
  };

  const filteredFiles = files.filter((file) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'images') return file.mimeType.startsWith('image/');
    if (activeTab === 'videos') return file.mimeType.startsWith('video/');
    if (activeTab === 'documents') return file.mimeType.includes('pdf') || file.mimeType.includes('document');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <FileUploadDropzone
        projectId={projectId}
        onUploadComplete={handleUploadComplete}
        maxSize={500 * 1024 * 1024}
        multiple
      />

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
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <FileListSkeleton />
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No files yet. Upload your first file above!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map((file) => (
                    <FileItem
                      key={file.fileId}
                      file={file}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                      onPreview={handlePreview}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Individual file item
 */
function FileItem({ file, onDelete, onDownload, onPreview }) {
  const isPreviewable = file.mimeType.startsWith('image/') || 
                        file.mimeType.startsWith('video/') || 
                        file.mimeType === 'application/pdf';

  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 text-3xl">{getFileIcon(file.mimeType)}</div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.filename}</p>
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
            {isPreviewable && (
              <DropdownMenuItem onClick={() => onPreview(file.fileId, file.filename)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDownload(file.fileId, file.filename)}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(file.fileId, file.filename)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
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
