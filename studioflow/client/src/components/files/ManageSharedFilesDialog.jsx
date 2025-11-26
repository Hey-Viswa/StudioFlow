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
import { Loader2, Trash2, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * ManageSharedFilesDialog Component
 * Manage file sharing for a specific file
 */
export function ManageSharedFilesDialog({ open, onOpenChange, projectId, file }) {
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

      setSharedWith(prev => prev.filter(s => s.userId !== clientId));
      toast.success('Access revoked successfully');
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

        setSharedWith(prev => prev.map(s => 
          s.userId === clientId ? { ...s, allowDownload: true } : s
        ));
        toast.success('Download enabled for client');
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Manage File Sharing</DialogTitle>
          <DialogDescription>
            View and manage who has access to "{file?.filename}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sharedWith.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>This file is not shared with any clients yet.</p>
            </div>
          ) : (
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
                      {share.userId}
                    </TableCell>
                    <TableCell>
                      {format(new Date(share.sharedAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(share.expiresAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={share.allowDownload ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleDownload(share.userId, share.allowDownload)}
                        disabled={toggling === share.userId}
                      >
                        {toggling === share.userId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : share.allowDownload ? (
                          <>
                            <Download className="w-4 h-4 mr-1" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
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
                        className="text-destructive hover:text-destructive"
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
