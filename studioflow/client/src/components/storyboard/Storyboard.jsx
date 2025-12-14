import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { storyboardApi } from '../../lib/storyboard';
import { useSocket } from '../../hooks/useSocket';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/clerk-react';
import { uploadFile, getFilePreviewUrl } from '../../lib/api/files';
import SceneNode from './SceneNode';
import StoryboardToolbar from './StoryboardToolbar';

const nodeTypes = {
  scene: SceneNode,
  note: SceneNode,
  image: SceneNode,
  video: SceneNode,
  file: SceneNode,
  default: SceneNode // Fallback
};

export default function Storyboard({ projectId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({ canEdit: false });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { socket } = useSocket();
  const { getToken } = useAuth();
  const draggingNodeRef = useRef(null);
  const reactFlowWrapper = useRef(null);

  // Load initial data
  useEffect(() => {
    loadStoryboard();
  }, [projectId]);

  const loadStoryboard = async () => {
    try {
      setLoading(true);
      const data = await storyboardApi.get(projectId);
      
      // Transform DB scenes to ReactFlow nodes
      const initialNodes = data.scenes.map(s => ({
        id: s._id,
        type: 'default', // Using default for now, switch to custom later
        position: s.position,
        data: { label: s.content || s.metadata?.label || 'New Scene', ...s }
      }));

      // Transform DB edges to ReactFlow edges
      const initialEdges = data.edges.map(e => ({
        id: e._id,
        source: e.sourceId,
        target: e.targetId,
        type: e.type === 'default' ? 'default' : 'smoothstep'
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);
      setPermissions(data.permissions);
    } catch (err) {
      console.error('Failed to load storyboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime Listeners
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-project', projectId); // Ensure we are in the room

    // Scene Created
    const handleSceneCreate = (newScene) => {
        setNodes((nds) => {
            if (nds.find(n => n.id === newScene._id)) return nds; // Dedup
            return [...nds, {
                id: newScene._id,
                type: 'default',
                position: newScene.position,
                data: { label: newScene.content || 'New Scene', ...newScene }
            }];
        });
    };

    // Scene Updated (Position, Content)
    const handleSceneUpdate = (updatedScene) => {
        // If I am currently dragging this node, IGNORE external updates to avoid jitter
        if (draggingNodeRef.current === updatedScene._id) return;

        setNodes((nds) => nds.map((n) => {
            if (n.id === updatedScene._id) {
                return {
                    ...n,
                    position: updatedScene.position,
                    data: { ...n.data, ...updatedScene, label: updatedScene.content || n.data.label }
                };
            }
            return n;
        }));
    };

    // Scene Deleted
    const handleSceneDelete = ({ sceneId }) => {
        setNodes((nds) => nds.filter((n) => n.id !== sceneId));
        setEdges((eds) => eds.filter(e => e.source !== sceneId && e.target !== sceneId));
    };

    // Edge Created
    const handleEdgeCreate = (newEdge) => {
        setEdges((eds) => {
            if (eds.find(e => e.id === newEdge._id)) return eds;
            return [...eds, {
                id: newEdge._id,
                source: newEdge.sourceId,
                target: newEdge.targetId,
                type: 'default'
            }];
        });
    };

    // Edge Deleted
    const handleEdgeDelete = ({ edgeId }) => {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    };

    // Cursor (Volatile)
    const handleCursorMove = ({ userId, x, y }) => {
        // TODO: Update a cursor overlay state
    };

    socket.on('scene:create', handleSceneCreate);
    socket.on('scene:update', handleSceneUpdate);
    socket.on('scene:delete', handleSceneDelete);
    socket.on('edge:create', handleEdgeCreate);
    socket.on('edge:delete', handleEdgeDelete);
    socket.on('storyboard:cursor', handleCursorMove);

    return () => {
        socket.off('scene:create', handleSceneCreate);
        socket.off('scene:update', handleSceneUpdate);
        socket.off('scene:delete', handleSceneDelete);
        socket.off('edge:create', handleEdgeCreate);
        socket.off('edge:delete', handleEdgeDelete);
        socket.off('storyboard:cursor', handleCursorMove);
    };
  }, [socket, projectId, setNodes, setEdges]);


  // Handlers
  const onConnect = useCallback(async (params) => {
    // Optimistic UI
    const tempId = `temp_${Date.now()}`;
    setEdges((eds) => addEdge({ ...params, id: tempId }, eds));

    try {
        const newEdge = await storyboardApi.createEdge(projectId, {
            sourceId: params.source,
            targetId: params.target,
            type: 'default'
        });
        
        // Replace temp edge with real one (or let realtime event do it)
        setEdges((eds) => eds.map(e => e.id === tempId ? { ...e, id: newEdge._id } : e));
    } catch (err) {
        toast.error('Failed to connect scenes');
        setEdges((eds) => eds.filter(e => e.id !== tempId));
    }
  }, [projectId, setEdges]);

  const onNodeDragStart = (_, node) => {
    draggingNodeRef.current = node.id;
  };

  const onNodeDragStop = async (_, node) => {
    draggingNodeRef.current = null;
    // Persist position
    try {
        await storyboardApi.updateScene(projectId, node.id, {
            position: node.position
        });
    } catch (e) {
        console.error('Failed to save node position');
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        reactFlowWrapper.current?.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    console.log('Drag over');
  }, []);

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();
      console.log('Drop event triggered', event.dataTransfer.types);

      if (!permissions.canEdit) {
        console.warn('Drop blocked: No edit permission. Current permissions:', permissions);
        toast.error('You do not have permission to edit');
        return;
      }

      // Handle video size limit
      const fileList = Array.from(event.dataTransfer.files);
      const invalidVideo = fileList.find(f => f.type.startsWith('video/') && f.size > 50 * 1024 * 1024);
      if (invalidVideo) {
         toast.error(`Video "${invalidVideo.name}" is too large. Max 50MB.`);
         return;
      }

      const position = reactFlowWrapper.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Handle Internal Drag (Toolbar)
      const type = event.dataTransfer.getData('application/reactflow');
      if (type) {
        let payload = {};
        try {
            payload = JSON.parse(event.dataTransfer.getData('application/payload'));
        } catch (e) {}

        await storyboardApi.createScene(projectId, {
            type: type,
            position,
            content: type === 'note' ? 'New Note' : payload.label || 'New Node',
            metadata: payload
        });
        return;
      }

      // Handle File Drag (Desktop)
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
          for (const file of files) {
            try {
               toast.loading(`Uploading ${file.name}...`, { id: 'upload-toast' });
               const uploaded = await uploadFile(projectId, file, getToken);
               
               let mediaUrl = null;
               if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                    const previewData = await getFilePreviewUrl(projectId, uploaded.fileId, getToken);
                    mediaUrl = previewData.previewUrl;
               }
    
               let type = 'file';
               if (file.type.startsWith('image/')) type = 'image';
               else if (file.type.startsWith('video/')) type = 'video';
    
               await storyboardApi.createScene(projectId, {
                    type,
                    position: { x: position.x + (Math.random() * 50), y: position.y + (Math.random() * 50) },
                    content: file.name,
                    metadata: { fileId: uploaded.fileId, mediaUrl, mimeType: file.type }
               });
    
               toast.success('File added to storyboard', { id: 'upload-toast' });
            } catch (e) {
                console.error(e);
                toast.error(`Failed to upload ${file.name}`, { id: 'upload-toast' });
            }
          }
      }
    },
    [projectId, permissions.canEdit, getToken]
  );

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div 
        ref={reactFlowWrapper}
        className={cn(
            "w-full bg-background relative transition-all duration-300 flex",
            "h-full" 
        )}
    >
      <StoryboardToolbar />
      <div 
        className="flex-1 h-full relative"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            // onDragOver/onDrop moved to parent for better hit testing
            fitView
            snapToGrid={true}
            snapGrid={[20, 20]}
        >
            <Background gap={20} />
            <Controls className="bg-white border rounded-lg shadow-md overflow-hidden" />
            <MiniMap 
                position="top-left"
                style={{ height: 120 }} 
                zoomable 
                pannable 
                nodeColor={(n) => {
                    if (n.type === 'note') return '#fde047'; 
                    return '#cbd5e1'; 
                }}
                maskColor="rgba(0, 0, 0, 0.2)"
                className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg"
            />
            
            <Panel position="top-right" className="flex gap-2">
                <button
                    onClick={toggleFullScreen}
                    className="bg-white dark:bg-slate-800 p-2 rounded-md shadow hover:bg-slate-100 transition-colors"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
