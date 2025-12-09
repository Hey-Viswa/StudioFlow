import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, Download, Eye, Users, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * ManageSharedFilesDialog Component
 * Manage file sharing for a specific file
 */
export function ManageSharedFilesDialog({ open, onOpenChange, projectId, file, onUpdate }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);
  const [revoking, setRevoking] = useState(null);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    if (open && file) {
      // Get shared info from file
      setSharedWith(file.sharedWith || []);
    }
  }, [open, file]);

  const handleRevokeAccess = async (clientId) => {
    try {
      setRevoking(clientId);
      const token = await getToken();
      const response = await fetch(`${API_BASE}/projects/${projectId}/files/${file.fileId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke access');
      }

      const updatedSharedWith = sharedWith.filter(s => s.userId !== clientId);
      setSharedWith(updatedSharedWith);
      toast.success('Access revoked successfully');

      // Notify parent
      if (onUpdate) {
        onUpdate({
          ...file,
          sharedWith: updatedSharedWith
        });
      }
    } catch (error) {
      console.error('Failed to revoke access:', error);
      toast.error(error.message || 'Failed to revoke access');
    } finally {
      setRevoking(null);
    }
  };

  const handleToggleDownload = async (clientId, currentValue) => {
    try {
      setToggling(clientId);
      const token = await getToken();

      if (!currentValue) {
        // Enable download
        const response = await fetch(`${API_BASE}/projects/${projectId}/files/${file.fileId}/enable-download`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to enable download');
        }

        const updatedSharedWith = sharedWith.map(s =>
          s.userId === clientId ? { ...s, allowDownload: true } : s
        );
        setSharedWith(updatedSharedWith);
        toast.success('Download enabled for client');

        // Notify parent
        if (onUpdate) {
          onUpdate({
            ...file,
            sharedWith: updatedSharedWith
          });
        }
      } else {
        toast.info('To disable download, revoke access and reshare');
      }
    } catch (error) {
      console.error('Failed to toggle download:', error);
      toast.error(error.message || 'Failed to update download permission');
    } finally {
      setToggling(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Manage File Sharing
          </DialogTitle>
          <DialogDescription>
            View and manage who has access to "{file?.filename}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sharedWith.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-16 h-16 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No shares yet</p>
              <p className="text-sm">This file hasn't been shared with any clients.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Shared On</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Download</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharedWith.map((share) => (
                    <TableRow key={share.userId}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{share.userId}</span>
                          {share.shareToken && (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-6 justify-start px-0 text-muted-foreground hover:text-primary"
                              onClick={() => {
                                const link = `${window.location.origin}/shared/${share.shareToken}`;
                                navigator.clipboard.writeText(link);
                                toast.success('Link copied to clipboard');
                              }}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Link
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(share.sharedAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(share.expiresAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={share.allowDownload ? 'default' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleDownload(share.userId, share.allowDownload)}
                          disabled={toggling === share.userId}
                          className="min-w-[130px]"
                        >
                          {toggling === share.userId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : share.allowDownload ? (
                            <>
                              <Download className="w-4 h-4 mr-1.5" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1.5" />
                              Preview Only
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeAccess(share.userId)}
                          disabled={revoking === share.userId}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {revoking === share.userId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Revoke
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
