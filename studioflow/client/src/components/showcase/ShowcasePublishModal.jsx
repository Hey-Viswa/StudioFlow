import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

/**
 * Modal to publish a file to the Creator Showcase
 */
export default function ShowcasePublishModal({ file, isOpen, onClose }) {
    const [title, setTitle] = useState(file?.name || '');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePublish = async () => {
        if (!title.trim()) return toast.error('Title is required');
        
        setLoading(true);
        try {
            await api.post('/showcase/publish', {
                fileId: file.id || file._id,
                projectId: file.projectId,
                title,
                description,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            
            toast.success('Published to Showcase');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to publish. Ensure project invoice is paid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Publish to Showcase</DialogTitle>
                    <DialogDescription>
                        Share this work on your public creator profile.
                        <br/><span className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">Note: Only available for paid projects.</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Project Name / Concept" />
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the work, tools used, or outcomes..." />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="tags">Tags (comma separated)</Label>
                        <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="design, vfx, branding" />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handlePublish} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Publish
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
