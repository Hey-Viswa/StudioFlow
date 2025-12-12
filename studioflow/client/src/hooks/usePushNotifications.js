import { useState, useEffect } from 'react';
import { requestForToken, onMessageListener } from '../lib/firebase';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const usePushNotifications = () => {
    const { getToken, userId } = useAuth();
    const [token, setToken] = useState(null);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (!userId) return;

        const registerToken = async () => {
            try {
                const currentToken = await requestForToken();
                if (currentToken) {
                    setToken(currentToken);

                    // Send token to backend
                    const authToken = await getToken();
                    await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ token: currentToken, platform: 'web' })
                    });

                    console.log('✅ FCM Token registered with backend');
                }
            } catch (error) {
                console.error('❌ Error registering FCM token:', error);
            }
        };

        registerToken();
    }, [userId, getToken]);

    useEffect(() => {
        const unsubscribe = onMessageListener().then((payload) => {
            setNotification(payload);
            toast(payload.notification.title, {
                description: payload.notification.body,
            });
            // console.log('🔔 Foreground push notification received');
        });

        return () => {
            // unsubscribe is a promise, so we can't just call it
        };
    }, []);

    return { token, notification };
};
