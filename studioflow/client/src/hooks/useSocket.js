import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Socket.IO connects to base URL, not /api endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', ''); // Remove /api suffix for Socket.IO

    if (socketRef.current) return;

    console.log('🔌 Connecting to Socket.IO:', socketUrl);

    // Initialize socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socket;
}

export function useProjectSocket(projectId, callbacks = {}) {
  const socket = useSocket();
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!socket || !projectId) return;

    // Join project room (send payload object to match server expectations)
    socket.emit('join-project', { projectId });

    // Create stable handlers that call the current callback ref
    const handlers = {
      onProjectUpdated: (data) => callbacksRef.current.onProjectUpdated?.(data),
      onMemberJoined: (data) => callbacksRef.current.onMemberJoined?.(data),
      onCommentAdded: (data) => callbacksRef.current.onCommentAdded?.(data),
      onCommentUpdated: (data) => callbacksRef.current.onCommentUpdated?.(data),
      onCommentDeleted: (data) => callbacksRef.current.onCommentDeleted?.(data),
      onTaskAdded: (data) => callbacksRef.current.onTaskAdded?.(data),
      onTaskUpdated: (data) => callbacksRef.current.onTaskUpdated?.(data),
      onTaskDeleted: (data) => callbacksRef.current.onTaskDeleted?.(data),
      onFileAdded: (data) => callbacksRef.current.onFileAdded?.(data),
      onFileDeleted: (data) => callbacksRef.current.onFileDeleted?.(data),
      onOwnershipRequest: (data) => callbacksRef.current.onOwnershipRequest?.(data),
      onOwnershipAccepted: (data) => callbacksRef.current.onOwnershipAccepted?.(data),
      onOwnershipCancelled: (data) => callbacksRef.current.onOwnershipCancelled?.(data),
    };

    // Listen for project updates
    socket.on('project-updated', handlers.onProjectUpdated);
    socket.on('member-joined', handlers.onMemberJoined);

    // Fix event names to match server (colons instead of hyphens)
    socket.on('comment:added', handlers.onCommentAdded);
    socket.on('comment:updated', handlers.onCommentUpdated);
    socket.on('comment:deleted', handlers.onCommentDeleted);

    socket.on('task-added', handlers.onTaskAdded);
    socket.on('task-updated', handlers.onTaskUpdated);
    socket.on('task-deleted', handlers.onTaskDeleted);
    socket.on('project:files:added', handlers.onFileAdded);
    socket.on('project:files:deleted', handlers.onFileDeleted);

    socket.on('ownership:request:created', handlers.onOwnershipRequest);
    socket.on('ownership:request:accepted', handlers.onOwnershipAccepted);
    socket.on('ownership:request:cancelled', handlers.onOwnershipCancelled);

    // Cleanup
    return () => {
      socket.emit('leave-project', { projectId });
      socket.off('project-updated', handlers.onProjectUpdated);
      socket.off('member-joined', handlers.onMemberJoined);

      socket.off('comment:added', handlers.onCommentAdded);
      socket.off('comment:updated', handlers.onCommentUpdated);
      socket.off('comment:deleted', handlers.onCommentDeleted);

      socket.off('task-added', handlers.onTaskAdded);
      socket.off('task-updated', handlers.onTaskUpdated);
      socket.off('task-deleted', handlers.onTaskDeleted);
      socket.off('project:files:added', handlers.onFileAdded);
      socket.off('project:files:deleted', handlers.onFileDeleted);

      socket.off('ownership:request:created', handlers.onOwnershipRequest);
      socket.off('ownership:request:accepted', handlers.onOwnershipAccepted);
      socket.off('ownership:request:cancelled', handlers.onOwnershipCancelled);
    };
  }, [socket, projectId]); // Only re-run if socket or projectId changes

  return socket;
}
