import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@clerk/clerk-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const FollowButton = ({ targetUsername, className }) => {
    const { isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Initial check (mocked for now as we might need a specific endpoint to check status efficiently or pass it in)
    // For MVP, we won't check on load to save API calls, or we assume the parent passed it.
    // Actually, let's optimize: The parent (ProfilePage) should probably pass 'isFollowing' status if possible.
    // But for a standalone button, we might want it to self-manage.
    // Let's implement the toggle logic first. 

    const handleFollow = async () => {
        if (!isSignedIn) {
            toast.error("Please sign in to follow creators");
            return;
        }

        setIsLoading(true);
        try {
            // Optimistic update
            setIsFollowing(prev => !prev);
            
            const data = await api.post(`/api/u/${targetUsername}/follow`, {}, { getToken });
            
            // Sync with server result
            setIsFollowing(data.following);
            toast.success(data.following ? `Following ${targetUsername}` : `Unfollowed ${targetUsername}`);
        } catch (error) {
            console.error('Follow error:', error);
            setIsFollowing(prev => !prev); // Revert
            toast.error("Failed to update follow status");
        } finally {
            setIsLoading(false);
        }
    };

    // Hide if owner
    if (isSignedIn && user?.username === targetUsername) return null;

    return (
        <Button 
            variant={isFollowing ? "outline" : "default"} 
            size="sm" 
            onClick={handleFollow}
            disabled={isLoading}
            className={`rounded-full px-6 ${className}`}
        >
            {isFollowing ? 'Following' : 'Follow'}
        </Button>
    );
};

export default FollowButton;
