import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, FileText, Download } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'; // Ensure this is available or handle accessible title manually

export function FilePreviewDialog({ open, onOpenChange, file }) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/');
  const isVideo = file.mimeType?.startsWith('video/');
  const isPDF = file.mimeType === 'application/pdf';
  const previewSource = file.previewUrl || file.url;

  // For dashboard preview, we might not want to show a download button at all
  // unless specific conditions are met (which the user said "not downloadable" in dashboard).
  // So we will strictly purely show the content.

  const renderContent = () => {
    if (isImage) {
      return (
        <div className="flex items-center justify-center p-4 bg-black/5 min-h-[300px] rounded-lg">
          <img 
            src={previewSource} 
            alt={file.filename} 
            className="max-w-full max-h-[80vh] object-contain shadow-sm" 
          />
        </div>
      );
    }
    
    if (isVideo) {
      return (
         <div className="flex items-center justify-center p-4 bg-black/5 min-h-[300px] rounded-lg">
          <video 
            src={previewSource} 
            controls 
            className="max-w-full max-h-[80vh] rounded-lg shadow-sm"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (isPDF) {
       return (
        <div className="w-full h-[80vh] bg-muted rounded-lg overflow-hidden">
          <iframe 
            src={`${previewSource}#toolbar=0`} 
            className="w-full h-full border-0" 
            title={file.filename}
          />
        </div>
       );
    }

    // Fallback for unsupported preview types
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground p-4 bg-muted/30 rounded-lg border-2 border-dashed">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">Preview not available</p>
        <p className="text-sm max-w-xs mx-auto">
          This file type ({file.mimeType}) cannot be previewed directly.
          Please visit the project content folder to view or download it if permitted.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between content-center bg-muted/50">
             <div className="flex flex-col gap-1">
                <DialogTitle className="text-base font-semibold truncate max-w-[500px] pr-8" title={file.filename}>
                    {file.filename}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                    preview mode
                </DialogDescription>
             </div>
             {/* Close button is automatically added by DialogContent usually, but customized header needs care */}
        </DialogHeader>
        
        <div className="p-4 bg-background">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
