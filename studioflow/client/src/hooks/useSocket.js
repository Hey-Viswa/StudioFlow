import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Initialize socket connection
    socketRef.current = io(apiUrl, {
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

    // Cleanup
    return () => {
      socket.emit('leave-project', projectId);
      socket.off('project-updated');
      socket.off('member-joined');
      socket.off('comment-added');
      socket.off('task-added');
      socket.off('task-updated');
    };
  }, [socket, projectId, callbacks]);

  return socket;
}
