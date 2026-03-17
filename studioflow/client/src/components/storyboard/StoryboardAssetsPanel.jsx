import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getProjectFiles, getFilePreviewUrl } from '@/lib/api/files';
import { FileUploadDropzone } from '../files/FileUploadDropzone';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Upload, VideoIcon, X } from 'lucide-react';
import { toast } from 'sonner';

export default function StoryboardAssetsPanel({ projectId }) {
  const { getToken } = useAuth();
  const [files, setFiles] = useState([]);
  const [thumbnailSrcById, setThumbnailSrcById] = useState({});
  const [thumbnailFailedById, setThumbnailFailedById] = useState({});
  const [thumbnailRetryById, setThumbnailRetryById] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      // Only fetch assets for storyboard
      const response = await getProjectFiles(projectId, token, { category: 'asset' });
      const nextFiles = response.files || [];
      setFiles(nextFiles);

      // Initialize thumbnail source map from API response for fast first paint
      const initialThumbs = {};
      nextFiles.forEach((file) => {
        if (file?.fileId && file?.previewUrl) {
          initialThumbs[file.fileId] = file.previewUrl;
        }
      });
      setThumbnailSrcById(initialThumbs);
      setThumbnailFailedById({});
      setThumbnailRetryById({});
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
        fetchFiles();
    }
  }, [projectId, isOpen]);

  const handleDragStart = (event, file) => {
    // Set data for drop
    let type = 'file';
    let mediaUrl = thumbnailSrcById[file.fileId] || file.previewUrl;
    
    if (file.mimeType.startsWith('image/')) type = 'image';
    else if (file.mimeType.startsWith('video/')) type = 'video';

    // We can pass metadata as JSON
    const payload = {
        label: file.filename,
        fileId: file.fileId,
        mediaUrl: mediaUrl,
        mimeType: file.mimeType,
        extension: file.filename.split('.').pop()
    };

    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.setData('application/payload', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'all';
  };

  const resolvePreviewUrl = async (file) => {
    if (!file?.fileId) return null;

    const existing = thumbnailSrcById[file.fileId];
    if (existing) return existing;

    try {
      const token = await getToken();
      const response = await getFilePreviewUrl(projectId, file.fileId, token);
      const preview = response?.previewUrl || null;
      if (preview) {
        setThumbnailSrcById((prev) => ({ ...prev, [file.fileId]: preview }));
        setThumbnailFailedById((prev) => ({ ...prev, [file.fileId]: false }));
      }
      return preview;
    } catch (error) {
      return null;
    }
  };

  const handleImageError = async (file) => {
    if (!file?.fileId) return;

    // Retry once by fetching a fresh signed preview URL.
    if (!thumbnailRetryById[file.fileId]) {
      setThumbnailRetryById((prev) => ({ ...prev, [file.fileId]: true }));
      const refreshed = await resolvePreviewUrl(file);
      if (refreshed) return;
    }

    setThumbnailFailedById((prev) => ({ ...prev, [file.fileId]: true }));
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const isMedia = file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/');
    
    // Only show media files (images/videos)
    return matchesSearch && isMedia;
  });

  if (!isOpen) {
     return (
        <div className="absolute right-0 top-4 z-50">
             <Button variant="outline" size="sm" className="rounded-l-md rounded-r-none border-r-0 shadow-md bg-background" onClick={() => setIsOpen(true)}>
                Files
             </Button>
        </div>
     );
  }

  return (
    <div className="w-80 h-full border-l bg-background flex flex-col transition-all duration-300 z-10 shadow-lg">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Assets</h3>
        <Button variant="ghost" size="icon-sm" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Upload Button */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
                <Button className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Asset
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Assets</DialogTitle>
                    <DialogDescription>
                        Upload images or videos to use in your storyboard.
                    </DialogDescription>
                </DialogHeader>
                <FileUploadDropzone 
                    projectId={projectId}
                    category="asset" // Specify category
                    tabs={['all', 'image', 'video']} // Restrict to supported visual media
                    accept="image/*,video/*"
                    onUploadComplete={() => {
                        fetchFiles();
                        // setUploadDialogOpen(false); // Can keep open for multiple
                    }}
                    multiple={true}
                    className="mt-4"
                />
            </DialogContent>
        </Dialog>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search assets..." 
                className="pl-8" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative mt-2">
            <ScrollArea className="h-full px-4 pb-4">
            {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center p-4 text-sm text-muted-foreground">No assets found.</div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {filteredFiles.map(file => (
                        <div 
                            key={file.fileId} 
                            className="group relative aspect-square border rounded-md overflow-hidden bg-muted cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
                            draggable
                            onDragStart={(e) => handleDragStart(e, file)}
                        >
                            {file.mimeType.startsWith('image/') ? (
                                !thumbnailFailedById[file.fileId] && (thumbnailSrcById[file.fileId] || file.previewUrl) ? (
                                  <img
                                    src={thumbnailSrcById[file.fileId] || file.previewUrl}
                                    alt={file.filename}
                                    className="w-full h-full object-cover"
                                    onError={() => handleImageError(file)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-600 text-xs px-2 text-center">
                                    No preview
                                  </div>
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                    <VideoIcon className="text-slate-400" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <p className="text-xs text-white truncate w-full">{file.filename}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </ScrollArea>
      </div>
    </div>
  );
}
