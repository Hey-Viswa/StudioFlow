import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Crown, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function OwnershipAcceptanceBanner({ projectId, onAccept, refreshKey = 0 }) {
    const { getToken, userId } = useAuth();
    const { user } = useUser();
    const [pendingRequest, setPendingRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (projectId && userId) {
            fetchPendingRequest();
        }
    }, [projectId, userId, refreshKey]);

    const fetchPendingRequest = async () => {
        try {
            const response = await api.get(`/projects/${projectId}/ownership/pending`, { getToken });
            setPendingRequest(response.request);
        } catch (error) {
            console.error('Failed to fetch pending request:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        setActionLoading(true);
        try {
            await api.post(`/projects/${projectId}/ownership/accept`, {
                requestId: pendingRequest._id
            }, { getToken });

            toast.success('Ownership transfer accepted! You are now the owner.');
            setPendingRequest(null);
            onAccept?.();
        } catch (error) {
            console.error('Failed to accept transfer:', error);
            toast.error(error.response?.data?.error || 'Failed to accept transfer');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        setActionLoading(true);
        try {
            // We can use the cancel endpoint or add a specific reject endpoint
            // For now, using cancel as it effectively does the same for the recipient
            // Ideally, we should have a reject endpoint, but cancel works if logic permits
            // Checking backend: cancelRequest checks if currentOwnerId === userId. 
            // So we might need a reject endpoint or update cancel to allow newOwner.
            // Let's check if we can add a reject endpoint or just hide it for now.
            // Actually, the user asked "how client will accept", so let's focus on accept first.
            // If we want reject, we should add it to backend.
            // For now, let's just implement Accept.
        } catch (error) {
            // ...
        }
    };

    if (loading || !pendingRequest) return null;

    // Only show if the current user is the new owner
    if (pendingRequest.newOwnerId !== userId) return null;

    return (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
            <Crown className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-semibold">
                Ownership Transfer Request
            </AlertTitle>
            <AlertDescription className="mt-2 flex items-center justify-between flex-wrap gap-4">
                <span className="text-amber-700">
                    You have been invited to become the owner of this project.
                    This will give you full administrative control.
                </span>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={handleAccept}
                        disabled={actionLoading}
                        className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                    >
                        {actionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Check className="h-4 w-4 mr-2" />
                        )}
                        Accept Ownership
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}
