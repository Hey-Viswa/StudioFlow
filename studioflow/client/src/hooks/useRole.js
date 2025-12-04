import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../lib/api';

export function useRole() {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const [role, setRole] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setRole(null);
            setUser(null);
            setLoading(false);
            return;
        }

        const fetchRole = async () => {
            try {
                const response = await api.get('/auth/me', { getToken });
                if (response.user) {
                    setRole(response.user.role);
                    setUser(response.user);
                }
            } catch (err) {
                console.error('Failed to fetch role:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [isLoaded, isSignedIn, getToken]);

    return {
        role,
        user,
        loading,
        error,
        isOwner: role === 'owner',
        isClient: role === 'client',
        isAdmin: role === 'admin' || role === 'owner',
        isMember: role === 'member' || role === 'admin' || role === 'owner'
    };
}
