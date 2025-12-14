
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@clerk/clerk-react';

export function ShowcaseConfigModal({ open, onOpenChange, projectId, file, onPublishComplete }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(file?.filename || '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  
  // Success State
  const [publishedSlug, setPublishedSlug] = useState(null);

  React.useEffect(() => {
    if (!open) {
      // Reset state on close
      setPublishedSlug(null);
      setLoading(false);
      setTitle(file?.filename || '');
      setDescription('');
      setTags('');
    }
  }, [open, file]);

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post('/showcase/publish', {
        fileId: file.fileId,
        title,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      }, { getToken });

      toast.success('Successfully published to showcase!');
      
      // Instead of closing, show success state
      if (response && response.slug) {
          setPublishedSlug(response.slug);
      } else {
          onOpenChange(false);
      }
      
      if (onPublishComplete) onPublishComplete(response);

    } catch (error) {
      console.error('Publish error:', error);
      if (error.message?.includes('402') || error.message?.includes('unpaid')) {
          toast.error('Cannot publish: Project has unpaid invoices.');
      } else {
          toast.error(error.message || 'Failed to publish to showcase');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
      const url = `${window.location.origin}/showcase/${publishedSlug}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {!publishedSlug ? (
            <>
                <DialogHeader>
                <DialogTitle>Add to Client Showcase</DialogTitle>
                <DialogDescription>
                    Create a public portfolio page for this file. 
                    <br />
                    <span className="flex items-center gap-1 text-amber-600 mt-1 text-xs">
                    <Lock className="w-3 h-3" /> Requires all project invoices to be paid.
                    </span>
                </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    {file.mimeType.startsWith('image/') ? (
                        <img src={file.previewUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Preview</div>
                    )}
                    </div>
                    <div className="space-y-1">
                        <p className="font-medium text-sm">{file.filename}</p>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">v{file.version}</Badge>
                            <Badge variant="secondary" className="text-xs">{file.mimeType}</Badge>
                        </div>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="title">Showcase Title</Label>
                    <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Final Brand Logo"
                    />
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the work..."
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (Comma separated)</Label>
                    <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. branding, logo, design"
                    />
                </div>
                </div>

                <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handlePublish} disabled={loading}>
                    {loading ? 'Publishing...' : (
                        <>
                            <Globe className="w-4 h-4 mr-2" />
                            Publish to Showcase
                        </>
                    )}
                </Button>
                </DialogFooter>
            </>
        ) : (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                        Published Successfully!
                    </DialogTitle>
                    <DialogDescription>
                        Your file is now live on the public showcase.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="p-4 bg-muted rounded-lg border flex items-center justify-between gap-3">
                        <div className="truncate text-sm text-muted-foreground flex-1">
                            {window.location.origin}/showcase/{publishedSlug}
                        </div>
                        <Button size="sm" variant="secondary" onClick={copyLink}>
                            Copy
                        </Button>
                    </div>

                    <div className="flex justify-center">
                        <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => window.open(`/showcase/${publishedSlug}`, '_blank')}
                        >
                            <Globe className="w-4 h-4 mr-2" />
                            View Live Page
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
