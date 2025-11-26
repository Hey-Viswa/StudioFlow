import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    // Socket.IO connects to base URL, not /api endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', ''); // Remove /api suffix for Socket.IO
    
    console.log('🔌 Connecting to Socket.IO:', socketUrl);
    
    // Initialize socket connection
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected:', socketRef.current.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
}

export function useProjectSocket(projectId, callbacks = {}) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !projectId) return;

    // Join project room
    socket.emit('join-project', projectId);

    // Listen for project updates
    if (callbacks.onProjectUpdated) {
      socket.on('project-updated', callbacks.onProjectUpdated);
    }

    if (callbacks.onMemberJoined) {
      socket.on('member-joined', callbacks.onMemberJoined);
    }

    if (callbacks.onCommentAdded) {
      socket.on('comment-added', callbacks.onCommentAdded);
    }

    if (callbacks.onTaskAdded) {
      socket.on('task-added', callbacks.onTaskAdded);
    }

    if (callbacks.onTaskUpdated) {
      socket.on('task-updated', callbacks.onTaskUpdated);
    }

    if (callbacks.onFileAdded) {
      socket.on('project:files:added', callbacks.onFileAdded);
    }

    if (callbacks.onFileDeleted) {
      socket.on('project:files:deleted', callbacks.onFileDeleted);
    }

    // Cleanup
    return () => {
      socket.emit('leave-project', projectId);
      socket.off('project-updated');
      socket.off('member-joined');
      socket.off('comment-added');
      socket.off('task-added');
      socket.off('task-updated');
      socket.off('project:files:added');
      socket.off('project:files:deleted');
    };
  }, [socket, projectId, callbacks]);

  return socket;
}
