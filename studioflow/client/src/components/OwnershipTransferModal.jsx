import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function OwnershipTransferModal({
    isOpen,
    onClose,
    project,
    onSuccess
}) {
    const { getToken } = useAuth();
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    // Filter active team members (exclude clients and current owner)
    const eligibleMembers = project?.members?.filter(
        m => m.role !== 'client' && m.userId !== project.ownerId && m.status === 'active'
    ) || [];

    const handleTransfer = async () => {
        if (!selectedMemberId) return;

        setLoading(true);
        try {
            await api.post(`/projects/${project._id}/ownership/request`, {
                newOwnerId: selectedMemberId
            }, { getToken });

            toast.success('Ownership transfer request sent');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Transfer request failed:', error);
            toast.error(error.response?.data?.error || 'Failed to request transfer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Transfer Project Ownership</DialogTitle>
                    <DialogDescription>
                        Transferring ownership will downgrade your role to Team Member.
                        The new owner must accept the request to finalize the transfer.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                            This action cannot be undone immediately. You will lose administrative control over this project.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label>Select New Owner</Label>
                        <Select
                            value={selectedMemberId}
                            onValueChange={setSelectedMemberId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a team member" />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleMembers.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        No eligible team members found
                                    </div>
                                ) : (
                                    eligibleMembers.map((member) => (
                                        <SelectItem key={member.userId} value={member.userId}>
                                            {member.name || member.email}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleTransfer}
                        disabled={!selectedMemberId || loading}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Request Transfer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
