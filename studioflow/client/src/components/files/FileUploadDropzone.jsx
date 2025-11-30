import React, { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { uploadFile, validateFile, formatFileSize } from '@/lib/api/files';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, File } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FileUploadDropzone Component
 * Handles drag-and-drop file uploads with progress tracking
 */
export function FileUploadDropzone({
  projectId,
  onUploadComplete,
  onUploadError,
  maxSize = 500 * 1024 * 1024, // 500MB default
  accept,
  multiple = true,
  className,
}) {
  const { getToken } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const fileInputRef = useRef(null);
  const abortControllersRef = useRef({});

  const getAcceptString = () => {
    switch (activeTab) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
      default: return accept;
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = async (files) => {
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter((file) => {
      const validation = validateFile(file, maxSize, getAcceptString());
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create upload entries
    const newUploads = validFiles.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      state: 'pending',
      error: null,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Start uploads
    for (const upload of newUploads) {
      processUpload(upload);
    }
  };

  const processUpload = async (upload) => {
    try {
      const token = await getToken();
      const controller = new AbortController();
      abortControllersRef.current[upload.id] = controller;

      await uploadFile(projectId, upload.file, token, {
        signal: controller.signal,
        onProgress: (percent) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id ? { ...u, progress: Math.round(percent) } : u
            )
          );
        },
        onStateChange: (state, error) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id ? { ...u, state, error: error || null } : u
            )
          );
        },
      });

      toast.success(`${upload.file.name} uploaded successfully`);
      onUploadComplete?.({ file: upload.file, uploadId: upload.id });

      // Remove from list after delay
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== upload.id));
        delete abortControllersRef.current[upload.id];
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      if (error.message !== 'Upload cancelled') {
        toast.error(`Failed to upload ${upload.file.name}: ${error.message}`);
        onUploadError?.({ file: upload.file, error, uploadId: upload.id });
      }

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id ? { ...u, state: 'error', error: error.message } : u
        )
      );
    }
  };

  const cancelUpload = (uploadId) => {
    const controller = abortControllersRef.current[uploadId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[uploadId];
    }

    setUploads((prev) =>
      prev.map((u) =>
        u.id === uploadId ? { ...u, state: 'cancelled', error: 'Cancelled by user' } : u
      )
    );

    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    }, 2000);
  };

  const retryUpload = (upload) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === upload.id
          ? { ...u, state: 'pending', error: null, progress: 0 }
          : u
      )
    );
    processUpload(upload);
  };

  const removeUpload = (uploadId) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    delete abortControllersRef.current[uploadId];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Tabs */}
      <div className="flex gap-2 pb-2 overflow-x-auto">
        {['all', 'image', 'video', 'audio', 'document'].map((type) => (
          <Button
            key={type}
            variant={activeTab === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(type)}
            className="capitalize whitespace-nowrap"
            type="button"
          >
            {type === 'all' ? 'All Files' : type + 's'}
          </Button>
        ))}
      </div>

      {/* Drop Zone */}
      <Card
        className={cn(
          'relative overflow-hidden transition-all border-2 border-dashed',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className={cn('w-6 h-6 text-primary', isDragging && 'animate-bounce')} />
          </div>

          <h3 className="text-lg font-semibold mb-1">Drop files here</h3>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse from your device
          </p>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple={multiple}
            accept={getAcceptString()}
            onChange={handleFileInputChange}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Select {activeTab === 'all' ? '' : activeTab} Files
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Maximum file size: {formatFileSize(maxSize)}
          </p>
        </div>
      </Card>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <UploadItem
              key={upload.id}
              upload={upload}
              onCancel={cancelUpload}
              onRetry={retryUpload}
              onRemove={removeUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual upload item with progress
 */
function UploadItem({ upload, onCancel, onRetry, onRemove }) {
  const getStateIcon = () => {
    switch (upload.state) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'uploading':
      case 'signing':
      case 'confirming':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default:
        return <File className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStateText = () => {
    switch (upload.state) {
      case 'signing':
        return 'Preparing...';
      case 'uploading':
        return `Uploading... ${upload.progress}%`;
      case 'confirming':
        return 'Finalizing...';
      case 'completed':
        return 'Complete';
      case 'error':
        return upload.error || 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{getStateIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium truncate">{upload.file.name}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatFileSize(upload.file.size)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mb-2">{getStateText()}</p>

          {(upload.state === 'uploading' || upload.state === 'signing' || upload.state === 'confirming') && (
            <Progress value={upload.progress} className="h-1" />
          )}
        </div>

        <div className="flex-shrink-0 flex gap-1">
          {upload.state === 'error' && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onRetry(upload)}
              title="Retry upload"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          )}

          {(upload.state === 'uploading' || upload.state === 'signing' || upload.state === 'pending') && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onCancel(upload.id)}
              title="Cancel upload"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {(upload.state === 'completed' || upload.state === 'error' || upload.state === 'cancelled') && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onRemove(upload.id)}
              title="Remove from list"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
