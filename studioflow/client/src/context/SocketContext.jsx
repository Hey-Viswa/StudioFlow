import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocketContext = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const { getToken, userId } = useAuth();
    const { user } = useUser();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // Use a ref to track the current socket to avoid closure staleness and redundant connections
    const socketRef = useRef(null);

    useEffect(() => {
        // Socket.IO connects to base URL, not /api endpoint
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const socketUrl = apiUrl.replace('/api', ''); // Remove /api suffix for Socket.IO

        // If we already have a socket connected or connecting, don't create another unless userId changed significantly? 
        // Actually, we want one global socket. If it exists, we might just need to re-authenticate it.
        // But simplified: Only connect if null.

        if (socketRef.current) {
            // If user changes, we might want to re-emit authenticate event handled below
            return;
        }

        // console.log('🔌 [SocketProvider] Initializing singleton socket connection to:', socketUrl);

        const newSocket = io(socketUrl, {
            // Force WebSocket to avoid Azure App Service polling/sticky session issues
            transports: ['websocket'],
            withCredentials: true,
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            path: '/socket.io/'
        });

        newSocket.on('connect', () => {
            // console.log('✅ [SocketProvider] Connected:', newSocket.id);
            setIsConnected(true);

            // Authenticate immediately on connect if coverage available
            if (userId) {
                // console.log('🔐 [SocketProvider] Authenticating with userId:', userId);
                newSocket.emit('authenticate', userId);
            }
        });

        newSocket.on('disconnect', (reason) => {
            // console.log('❌ [SocketProvider] Disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('⚠️ [SocketProvider] Connection error:', error.message);
            setIsConnected(false);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        // Cleanup on unmount (app close)
        return () => {
            // console.log('🛑 [SocketProvider] Cleaning up socket...');
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
        };
    }, []); // Only run once on mount

    // Handle authentication when user/auth state changes
    useEffect(() => {
        if (socket && isConnected && userId) {
            // Re-authenticate if user changes or on reconnection
            // console.log('🔐 [SocketProvider] Re-authenticating/Updating auth:', userId);
            socket.emit('authenticate', userId);
        }
    }, [socket, isConnected, userId]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
