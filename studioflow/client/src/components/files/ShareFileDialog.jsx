import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Share2, Copy, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * ShareFileDialog Component
 * Dialog for sharing files with project clients
 */
export function ShareFileDialog({ open, onOpenChange, projectId, fileId, fileIds, filename, onShareComplete }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [shareUrl, setShareUrl] = useState(''); // Only used for single file
  const [copied, setCopied] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  const isBulk = !!(fileIds && fileIds.length > 0);
  const targetFileIds = isBulk ? fileIds : (fileId ? [fileId] : []);

  useEffect(() => {
    if (open && projectId) {
      fetchProjectClients();
    }
  }, [open, projectId]);

  const fetchProjectClients = async () => {
    try {
      setLoadingClients(true);
      const token = await getToken();
      const response = await fetch(`${API_BASE}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch project');

      const data = await response.json();
      // Filter for clients only
      const projectClients = (data.project?.members || []).filter(m => m.role === 'client');
      setClients(projectClients);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const handleShare = async () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (isBulk) {
        const response = await fetch(`${API_BASE}/projects/${projectId}/files/bulk-share`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: selectedClient,
            fileIds: targetFileIds,
            allowDownload,
            expiresInDays,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to share files');
        }

        const sharedCount = Array.isArray(result.shared) ? result.shared.length : 0;
        const missingCount = Array.isArray(result.missing) ? result.missing.length : 0;
        const missingSuffix = missingCount ? ` (${missingCount} missing)` : '';

        toast.success(`Shared ${sharedCount} file${sharedCount === 1 ? '' : 's'}${missingSuffix}`);
        onShareComplete?.();
        handleClose(); // Close immediately for bulk
      } else {
        const response = await fetch(`${API_BASE}/projects/${projectId}/files/${targetFileIds[0]}/share`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: selectedClient,
            allowDownload,
            expiresInDays,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to share file');
        }

        setShareUrl(result.shareUrl);
        toast.success('File shared successfully');
        onShareComplete?.();
      }
    } catch (error) {
      console.error('Failed to share file(s):', error);
      toast.error(error.message || 'Failed to share files');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setSelectedClient('');
    setAllowDownload(false);
    setExpiresInDays(90);
    setShareUrl('');
    setCopied(false);
    onOpenChange(false);
  };

  const shareTitle = isBulk ? `Share ${targetFileIds.length} file${targetFileIds.length === 1 ? '' : 's'}` : 'Share File';
  const shareDescription = isBulk
    ? 'Share selected files with a client. They will be able to preview the files.'
    : `Share "${filename}" with a client. They will be able to preview the file.`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            {shareTitle}
          </DialogTitle>
          <DialogDescription>
            {shareDescription}
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client">Select Client</Label>
              {loadingClients ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading clients...
                </div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No clients found on this project. Add clients to the project first.
                </p>
              ) : (
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.userId} value={client.userId}>
                        {client.name || client.email || client.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expires In (Days)</Label>
              <Input
                id="expires"
                type="number"
                min="1"
                max="90"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="download">Allow Download</Label>
                <p className="text-sm text-muted-foreground">
                  Enable immediate download (usually after payment)
                </p>
              </div>
              <Switch
                id="download"
                checked={allowDownload}
                onCheckedChange={setAllowDownload}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Send this link to the client. It will expire in {expiresInDays} days.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!shareUrl ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={loading || !selectedClient || clients.length === 0}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isBulk ? 'Share Files' : 'Share File'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
