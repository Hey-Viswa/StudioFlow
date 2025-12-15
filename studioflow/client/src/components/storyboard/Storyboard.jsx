import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  addEdge, 
  reconnectEdge,
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
import StoryboardAssetsPanel from './StoryboardAssetsPanel';
import ContextMenu from './ContextMenu';

const nodeTypes = {
  scene: SceneNode,
  note: SceneNode,
  image: SceneNode,
  video: SceneNode,
  file: SceneNode,
  'arrow-annotation': SceneNode,
  default: SceneNode // Fallback
};

export default function Storyboard({ projectId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({ canEdit: false });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { socket } = useSocket();
  const { getToken, isLoaded } = useAuth();
  const draggingNodeRef = useRef(null);
  const reactFlowWrapper = useRef(null);
  const [menu, setMenu] = useState(null); // { id, top, left, right, bottom, type, data }
  
  // Undo/Redo Stacks
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const dragStartPosRef = useRef(null); // To track move deltas
  const dragChildrenRefs = useRef({}); // Snapshot of children positions
  
  // Wait, useReactFlow check: The Storyboard component renders ReactFlow. 
  // We cannot use useReactFlow HOOK inside the component needed to RENDER the provider context if it's not wrapped.
  // BUT, we have `reactFlowInstance` state. accessing that is better.

  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const addToHistory = useCallback((action) => {
      historyRef.current.push(action);
      redoRef.current = [];
  }, []);

  const handleNodeUpdate = useCallback(async (id, updates) => {
    // Snapshot previous state for history
    setNodes((nds) => {
        const node = nds.find(n => n.id === id);
        if (node) {
             // If we are updating content or zIndex, push to history
             // But we need to avoid pushing during specific high-frequency events if we handle them elsewhere?
             // Actually, resizing uses this.
             // We can check keys. 
             const relevantKeys = ['content', 'zIndex', 'dimensions', 'isLocked'];
             if (Object.keys(updates).some(k => relevantKeys.includes(k) || (updates.data && relevantKeys.some(sk => sk in updates.data)))) {
                  addToHistory({
                      type: 'update',
                      nodeId: id,
                      from: { ...node.data }, // save data snapshot
                      to: { ...node.data, ...updates }
                  });
             }
        }
        return nds.map((n) => {
             if (n.id === id) {
                 const newNode = { ...n, data: { ...n.data, ...updates } };
                 if (updates.zIndex !== undefined) newNode.zIndex = updates.zIndex;
                 if (updates.data?.zIndex !== undefined) newNode.zIndex = updates.data.zIndex;
                 
                 // Handle Resize
                 if (updates.dimensions) {
                     newNode.style = { 
                         ...newNode.style, 
                         width: updates.dimensions.width, 
                         height: updates.dimensions.height 
                     };
                 }
                 return newNode;
             }
             return n;
        });
    });

    try {
        await storyboardApi.updateScene(projectId, id, updates, getToken);
    } catch (e) { console.error('Update failed'); }
  }, [projectId, setNodes, getToken, addToHistory]);

  // Load initial data
  useEffect(() => {
    if (projectId && isLoaded) {
        loadStoryboard();
    }
  }, [projectId, isLoaded]);

  const loadStoryboard = async () => {
    try {
      setLoading(true);
      // Debug token availability
      const token = await getToken();
      if (!token) console.warn('No auth token available for storyboard load');
      
      const data = await storyboardApi.get(projectId, getToken);
      
      console.log('Storyboard loaded:', data);

      if (data.permissions) {
          setPermissions(data.permissions);
      }

      // Transform DB scenes to ReactFlow nodes
      const initialNodes = (data.scenes || []).map(s => ({
        id: s._id,
        type: 'default',
        position: s.position,
        zIndex: s.zIndex || 1, // Fix Z-Index rendering
        data: { label: s.content || s.metadata?.label || 'New Scene', ...s, updateNode: handleNodeUpdate }
      })).sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

      // Transform DB edges to ReactFlow edges
      const initialEdges = (data.edges || []).map(e => ({
        id: e._id,
        source: e.sourceId,
        target: e.targetId,
        type: e.type === 'default' ? 'default' : 'smoothstep'
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);
      
    } catch (err) {
      console.error('Failed to load storyboard:', err);
      toast.error('Failed to load storyboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Realtime Listeners
  useEffect(() => {
    if (!socket || !projectId) return;
    
    socket.emit('join-project', projectId);

    const handleSceneCreate = (scene) => {
         setNodes((nds) => {
            if (nds.some(n => n.id === scene._id)) return nds;
            return [...nds, {
                id: scene._id,
                type: 'default',
                position: scene.position,
                zIndex: scene.zIndex || 1,
                data: { label: scene.content || scene.metadata?.label || 'New Scene', ...scene, updateNode: handleNodeUpdate }
            }];
         });
    };

    const handleSceneUpdate = (updatedScene) => {
         setNodes((nds) => nds.map((n) => {
            if (n.id === updatedScene._id) {
                const updatedNode = { 
                    ...n, 
                    position: updatedScene.position,
                    zIndex: updatedScene.zIndex || 1, // Update zIndex
                    data: { ...n.data, ...updatedScene, label: updatedScene.content || updatedScene.metadata?.label || n.data.label } 
                };
                
                if (updatedScene.dimensions) {
                    updatedNode.style = {
                         ...updatedNode.style,
                         width: updatedScene.dimensions.width,
                         height: updatedScene.dimensions.height
                    };
                }
                return updatedNode;
            }
            return n;
         }));
    };

    const handleSceneDelete = ({ sceneId }) => {
         setNodes((nds) => nds.filter((n) => n.id !== sceneId));
         setEdges((eds) => eds.filter(e => e.source !== sceneId && e.target !== sceneId));
    };

    const handleEdgeCreate = (edge) => {
         setEdges((eds) => {
             if (eds.some(e => e.id === edge._id)) return eds;
             return addEdge({
                id: edge._id,
                source: edge.sourceId,
                target: edge.targetId,
                type: edge.type === 'default' ? 'default' : 'smoothstep'
             }, eds);
         });
    };

    const handleEdgeUpdate = (updatedEdge) => {
        setEdges((eds) => eds.map((e) => {
            if (e.id === updatedEdge._id) {
                return {
                    ...e,
                    source: updatedEdge.sourceId,
                    target: updatedEdge.targetId
                };
            }
            return e;
        }));
    };

    const handleEdgeDelete = ({ edgeId }) => {
         setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    };

    socket.on('scene:create', handleSceneCreate);
    socket.on('scene:update', handleSceneUpdate);
    socket.on('scene:delete', handleSceneDelete);
    socket.on('edge:create', handleEdgeCreate);
    socket.on('edge:update', handleEdgeUpdate); // Listen for edge updates
    socket.on('edge:delete', handleEdgeDelete);

    return () => {
        socket.off('scene:create', handleSceneCreate);
        socket.off('scene:update', handleSceneUpdate);
        socket.off('scene:delete', handleSceneDelete);
        socket.off('edge:create', handleEdgeCreate);
        socket.off('edge:update', handleEdgeUpdate);
        socket.off('edge:delete', handleEdgeDelete);
    };
  }, [socket, projectId, handleNodeUpdate]);

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
        }, getToken);
        
        // Replace temp edge with real one (or let realtime event do it)
        setEdges((eds) => eds.map(e => e.id === tempId ? { ...e, id: newEdge._id } : e));
    } catch (err) {
        toast.error('Failed to connect scenes');
        setEdges((eds) => eds.filter(e => e.id !== tempId));
    }
  }, [projectId, setEdges, getToken]);

  const onReconnect = useCallback(async (oldEdge, newConnection) => {
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    try {
        await storyboardApi.updateEdge(projectId, oldEdge.id, {
            sourceId: newConnection.source,
            targetId: newConnection.target
        }, getToken);
    } catch (e) {
        console.error('Reconnect failed');
        toast.error('Failed to update connection');
    }
  }, [projectId, setEdges, getToken]);

  const onNodeDragStart = (_, node) => {
    draggingNodeRef.current = node.id;
    dragStartPosRef.current = { ...node.position }; // snapshot start
    
    // Snapshot children if group
    if (nodes.some(n => n.data.groupId === node.id)) {
        const children = {};
        nodes.forEach(n => {
             if (n.data.groupId === node.id) {
                 children[n.id] = { ...n.position };
             }
        });
        dragChildrenRefs.current = children;
    } else {
        dragChildrenRefs.current = {};
    }
  };

  const onNodeDrag = useCallback((_, node) => {
      // Group Logic
      const startPos = dragStartPosRef.current;
      const childSnapshots = dragChildrenRefs.current;
      
      if (startPos && Object.keys(childSnapshots).length > 0) {
          const deltaX = node.position.x - startPos.x;
          const deltaY = node.position.y - startPos.y;
          
          setNodes((nds) => nds.map(n => {
              if (childSnapshots[n.id]) {
                  return {
                      ...n,
                      position: {
                          x: childSnapshots[n.id].x + deltaX,
                          y: childSnapshots[n.id].y + deltaY
                      }
                  };
              }
              return n;
          }));
      }
  }, []);



  const onNodeDragStop = async (_, node) => {
    draggingNodeRef.current = null;
    
    // Check if moved
    const startPos = dragStartPosRef.current;
    if (startPos && (startPos.x !== node.position.x || startPos.y !== node.position.y)) {
        addToHistory({
            type: 'move',
            nodeId: node.id,
            from: startPos,
            to: { ...node.position }
        });
    }
    dragStartPosRef.current = null;

    // Persist position
    try {
        await storyboardApi.updateScene(projectId, node.id, {
            position: node.position
        }, getToken);
    } catch (e) {
        console.error('Failed to save node position');
    }
    // Save children positions if any moved
    const childSnapshots = dragChildrenRefs.current;
    if (Object.keys(childSnapshots).length > 0) {
         const currentNodes = reactFlowInstance?.getNodes() || [];
         for (const childId of Object.keys(childSnapshots)) {
             const childNode = currentNodes.find(n => n.id === childId);
             if (childNode) {
                 storyboardApi.updateScene(projectId, childId, { position: childNode.position }, getToken);
             }
         }
    }
    dragChildrenRefs.current = {}; // clear
  }; 

  // Wait, the above logic is flawed because I don't have initial positions of children.
  // Correct Re-Implementation below.



  const onNodesDelete = useCallback(async (deleted) => {
    for (const node of deleted) {
        addToHistory({
            type: 'delete',
            node: node
        });
        try {
            await storyboardApi.deleteScene(projectId, node.id, getToken);
        } catch (e) {
            console.error('Failed to delete node', e);
            toast.error('Failed to delete node');
        }
    }
  }, [projectId, getToken, addToHistory]);

  const onEdgesDelete = useCallback(async (deleted) => {
    for (const edge of deleted) {
        try {
            await storyboardApi.deleteEdge(projectId, edge.id, getToken);
        } catch (e) {
             console.error('Failed to delete edge', e);
        }
    }
  }, [projectId, getToken]);

  // Context Menu Handlers
  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault(); // Prevent native context menu
      
      const pane = reactFlowWrapper.current.getBoundingClientRect();
      const selectedNodes = reactFlowInstance?.getNodes().filter(n => n.selected) || [];
      
      if (selectedNodes.length > 1 && selectedNodes.some(n => n.id === node.id)) {
           // Multi-selection menu
           setMenu({
             id: node.id, // Primary target
             selectedIds: selectedNodes.map(n => n.id),
             top: event.clientY - pane.top,
             left: event.clientX - pane.left,
             type: 'multiselect',
             data: { count: selectedNodes.length }
           });
      } else {
           // Single selection
           setMenu({
             id: node.id,
             top: event.clientY - pane.top,
             left: event.clientX - pane.left,
             type: 'scene',
             data: node.data
           });
      }
    },
    [reactFlowInstance]
  );

  const onEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current.getBoundingClientRect();
      setMenu({
        id: edge.id,
        top: event.clientY - pane.top,
        left: event.clientX - pane.left,
        type: 'edge',
        data: edge.data || {}
      });
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current.getBoundingClientRect();
      
      // Fallback: Check if we have a multi-selection active
      // Sometimes users right-click "near" the nodes or on the selection rect
      const selectedNodes = reactFlowInstance?.getNodes().filter(n => n.selected) || [];
      
      if (selectedNodes.length > 1) {
           setMenu({
             id: selectedNodes[0].id, // Primary
             selectedIds: selectedNodes.map(n => n.id),
             top: event.clientY - pane.top,
             left: event.clientX - pane.left,
             type: 'multiselect',
             data: { count: selectedNodes.length }
           });
           return;
      }

      setMenu({
        top: event.clientY - pane.top,
        left: event.clientX - pane.left,
        type: 'pane',
        data: { x: event.clientX, y: event.clientY } // Raw coords for creation
      });
    },
    [reactFlowInstance]
  );

  const onMenuClose = useCallback(() => setMenu(null), []);

  const handleMenuAction = async (action, data) => {
      if (!menu) return;

      if (action === 'delete') {
          if (menu.type === 'scene') {
                const nodeToDelete = nodes.find(n => n.id === menu.id);
                setNodes((nds) => nds.filter((n) => n.id !== menu.id));
                if (nodeToDelete) {
                     onNodesDelete([nodeToDelete]);
                }
          } else if (menu.type === 'edge') {
               setEdges((eds) => eds.filter((e) => e.id !== menu.id));
               onEdgesDelete([{ id: menu.id }]);
          } else if (menu.type === 'multiselect' && menu.selectedIds) {
               // Batch Delete
               const nodesToDelete = nodes.filter(n => menu.selectedIds.includes(n.id));
               setNodes((nds) => nds.filter((n) => !menu.selectedIds.includes(n.id)));
               if (nodesToDelete.length > 0) {
                   onNodesDelete(nodesToDelete);
               }
          }
      }

      if (action === 'duplicate') {
          if (menu.type === 'scene') {
             // ... single duplicate logic existing ...
             try {
                // Offset position
                const originalNode = nodes.find(n => n.id === menu.id);
                if (!originalNode) return;

                const newPos = { 
                    x: originalNode.position.x + 20, 
                    y: originalNode.position.y + 20 
                };

                const newScene = await storyboardApi.createScene(projectId, {
                    type: data.type,
                    position: newPos,
                    content: data.content + ' (Copy)',
                    metadata: data.metadata,
                    zIndex: data.zIndex || 1
                }, getToken);

                setNodes((nds) => [...nds, {
                    id: newScene._id,
                    type: 'default',
                    position: newScene.position,
                    zIndex: newScene.zIndex || 1,
                    data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate }
                }]);

                addToHistory({
                    type: 'create',
                    nodeId: newScene._id,
                    node: { id: newScene._id, type: 'default', position: newScene.position, data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate } }
                });
            } catch(e) {
                toast.error('Failed to duplicate');
            }
          } else if (menu.type === 'multiselect' && menu.selectedIds) {
              // Batch Duplicate
              try {
                  menu.selectedIds.forEach(async (id) => {
                      const originalNode = nodes.find(n => n.id === id);
                      if (originalNode) {
                          const newPos = { x: originalNode.position.x + 20, y: originalNode.position.y + 20 };
                           const newScene = await storyboardApi.createScene(projectId, {
                                type: originalNode.data.type,
                                position: newPos,
                                content: (originalNode.data.content || '') + ' (Copy)',
                                metadata: originalNode.data.metadata,
                                zIndex: originalNode.data.zIndex || 1
                           }, getToken);
                           
                           setNodes((nds) => [...nds, {
                                id: newScene._id,
                                type: 'default',
                                position: newScene.position,
                                zIndex: newScene.zIndex || 1,
                                data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate }
                           }]);
                           
                           addToHistory({
                                type: 'create',
                                nodeId: newScene._id,
                                node: { id: newScene._id, type: 'default', position: newScene.position, data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate } }
                           });
                      }
                  });
              } catch(e) {
                  toast.error('Failed to duplicate selection');
              }
          }
      }

      if (action === 'groupSelection' && menu.type === 'multiselect' && menu.selectedIds) {
           // 1. Identify Parent (first one)
           const parentId = menu.selectedIds[0];
           const childIds = menu.selectedIds.slice(1);
           
           if (childIds.length === 0) return;

           // 2. Optimistic Update
           setNodes((nds) => nds.map(n => {
               if (n.id === parentId) return { ...n, data: { ...n.data, isGroup: true } };
               if (childIds.includes(n.id)) return { ...n, data: { ...n.data, groupId: parentId } };
               return n;
           }));

           // 3. Backend Persistence
           try {
               await storyboardApi.updateScene(projectId, parentId, { isGroup: true }, getToken);
               childIds.forEach(async (cid) => {
                   await storyboardApi.updateScene(projectId, cid, { groupId: parentId }, getToken);
               });
               toast.success('Grouped successfully');
           } catch(e) {
               toast.error('Failed to group selection');
           }
      }

      if (action === 'toggleLock') {
          if (menu.type === 'scene') {
              const newLockState = !data.isLocked;
              
              // Optimistic update
              setNodes((nds) => nds.map(n => n.id === menu.id ? { ...n, data: { ...n.data, isLocked: newLockState } } : n));
              
              try {
                await storyboardApi.updateScene(projectId, menu.id, { isLocked: newLockState }, getToken);
              } catch(e) {
                  toast.error('Failed to toggle lock');
                  // Revert
                  setNodes((nds) => nds.map(n => n.id === menu.id ? { ...n, data: { ...n.data, isLocked: data.isLocked } } : n));
              }
          }
      }

      if (action === 'bringToFront') {
          if (menu.type === 'scene') {
              const maxZ = Math.max(...nodes.map(n => n.data.zIndex || 1), 1);
              const newZ = maxZ + 1;
              
              // Optimistic
              setNodes((nds) => {
                  const updatedParams = nds.map(n => n.id === menu.id ? { 
                      ...n, 
                      zIndex: newZ, 
                      style: { ...n.style, zIndex: newZ },
                      data: { ...n.data, zIndex: newZ } 
                  } : n);
                  return updatedParams.sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
              });
              
              
              // Backend
              try {
                  await storyboardApi.updateScene(projectId, menu.id, { zIndex: newZ }, getToken);
              } catch(e) {
                  toast.error('Failed to update layer');
              }
          }
      }

      if (action === 'sendToBack') {
           if (menu.type === 'scene') {
              const minZ = Math.min(...nodes.map(n => n.data.zIndex || 1), 1);
              const newZ = minZ - 1;
              
              // Optimistic
              // Optimistic
              setNodes((nds) => {
                  const updatedParams = nds.map(n => n.id === menu.id ? { 
                      ...n, 
                      zIndex: newZ, 
                      style: { ...n.style, zIndex: newZ },
                      data: { ...n.data, zIndex: newZ } 
                  } : n);
                  return updatedParams.sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
              });
              
              try {
                  await storyboardApi.updateScene(projectId, menu.id, { zIndex: newZ }, getToken);
              } catch(e) {
                  toast.error('Failed to update layer');
              }
           }
      }
      
      if (action === 'createNote' || action === 'createText') {
          if (reactFlowInstance) {
               const position = reactFlowInstance.screenToFlowPosition({
                    x: menu.data.x,
                    y: menu.data.y
               });
               
               const type = action === 'createText' ? 'scene' : 'note'; // 'scene' defaults to transparent text-like if we configured it, or just use 'note'
               const content = action === 'createText' ? 'New Text' : 'New Note';
               
               try {
                   const newScene = await storyboardApi.createScene(projectId, {
                        type: type,
                        position,
                        content: content,
                        metadata: { type: action === 'createText' ? 'text' : 'note' }
                   }, getToken);
                   
                   addToHistory({
                        type: 'create',
                        nodeId: newScene._id,
                        node: { id: newScene._id, type: 'default', position: newScene.position, data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate } }
                   });

                   setNodes((nds) => [...nds, {
                        id: newScene._id,
                        type: 'default',
                        position: newScene.position,
                        data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate }
                   }]);
               } catch(e) {
                   toast.error('Failed to create item');
               }
          }
      }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    const handleKeyDown = async (e) => {
        // Ctrl + Z: Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            const action = historyRef.current.pop();
            if (!action) return;

             if (action.type === 'move') {
                 // Revert visual
                 setNodes((nds) => nds.map(n => n.id === action.nodeId ? { ...n, position: action.from } : n));
                 storyboardApi.updateScene(projectId, action.nodeId, { position: action.from }, getToken);
                 redoRef.current.push(action);
             } else if (action.type === 'delete') {
                 // Undo Delete: Restore
                 setNodes((nds) => [...nds, action.node]);
                 try {
                      // We try to restore with same ID if possible, otherwise we accept new ID (limit)
                      // Ideally backend allows providing ID on create for restore purposes.
                      // If not, we might lose connections if edges depended on it.
                      // For now, simple create.
                      storyboardApi.createScene(projectId, { 
                          ...action.node.data, 
                          _id: action.node.id, // Try to pass ID?
                          position: action.node.position 
                      }, getToken);
                 } catch(e) {}
                 redoRef.current.push(action);
             } else if (action.type === 'create') {
                 // Undo Create: Delete
                 setNodes((nds) => nds.filter(n => n.id !== action.nodeId));
                 storyboardApi.deleteScene(projectId, action.nodeId, getToken);
                 redoRef.current.push(action);
             } else if (action.type === 'update') {
                 // Undo Update
                 setNodes((nds) => nds.map(n => n.id === action.nodeId ? { ...n, data: { ...n.data, ...action.from } } : n));
                 storyboardApi.updateScene(projectId, action.nodeId, action.from, getToken);
                 redoRef.current.push(action);
             }
        }
        
        // Ctrl + Shift + Z: Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' && e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
            e.preventDefault();
            const action = redoRef.current.pop();
            if (!action) return;

            if (action.type === 'move') {
                 setNodes((nds) => nds.map(n => n.id === action.nodeId ? { ...n, position: action.to } : n));
                 storyboardApi.updateScene(projectId, action.nodeId, { position: action.to }, getToken);
                 historyRef.current.push(action);
            } else if (action.type === 'delete') {
                 // Redo Delete
                 setNodes((nds) => nds.filter(n => n.id !== action.node.id));
                 storyboardApi.deleteScene(projectId, action.node.id, getToken);
                 historyRef.current.push(action);
            } else if (action.type === 'create') {
                 // Redo Create
                 setNodes((nds) => [...nds, action.node]);
                 storyboardApi.createScene(projectId, { ...action.node.data, position: action.node.position }, getToken);
                 historyRef.current.push(action);
            } else if (action.type === 'update') {
                 // Redo Update
                 setNodes((nds) => nds.map(n => n.id === action.nodeId ? { ...n, data: { ...n.data, ...action.to } } : n));
                 storyboardApi.updateScene(projectId, action.nodeId, action.to, getToken);
                 historyRef.current.push(action);
            }
        }

        // Ctrl + D: Duplicate
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            if (!reactFlowInstance) return;
            const selected = reactFlowInstance.getNodes().filter(n => n.selected);
            if (selected.length === 0) return;

            // Duplicate all selected
            for (const node of selected) {
                try {
                     const newPos = { x: node.position.x + 20, y: node.position.y + 20 };
                     const newScene = await storyboardApi.createScene(projectId, {
                        type: node.data.type || 'note',
                        position: newPos,
                        content: (node.data.content || node.data.label) + ' (Copy)',
                        metadata: node.data.metadata
                    }, getToken);
                    
                    addToHistory({
                        type: 'create',
                        nodeId: newScene._id,
                        node: { id: newScene._id, type: 'default', position: newScene.position, data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate } }
                    });

                    setNodes((nds) => [...nds, {
                        id: newScene._id,
                        type: 'default',
                        position: newScene.position,
                        data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate }
                    }]);
                } catch(err) {
                    console.error('Failed to duplicate via hotkey', err);
                }
            }
        }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [reactFlowInstance, projectId, getToken, handleNodeUpdate, setNodes]);

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
      
      if (!reactFlowInstance) {
        console.error('React Flow instance not initialized');
        return;
      }

      // Handle video size limit
      const fileList = Array.from(event.dataTransfer.files);
      const invalidVideo = fileList.find(f => f.type.startsWith('video/') && f.size > 50 * 1024 * 1024);
      if (invalidVideo) {
         toast.error(`Video "${invalidVideo.name}" is too large. Max 50MB.`);
         return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
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

        const newScene = await storyboardApi.createScene(projectId, {
            type: type,
            position,
            content: type === 'note' ? 'New Note' : payload.label || 'New Node',
            metadata: payload
        }, getToken);
        
        addToHistory({
             type: 'create',
             nodeId: newScene._id,
             node: { id: newScene._id, type: 'default', position: newScene.position, data: { label: newScene.content, ...newScene, updateNode: handleNodeUpdate } }
        });

        setNodes((nds) => [...nds, {
             id: newScene._id,
             type: 'default',
             position: newScene.position,
             data: { label: newScene.content || '', ...newScene, updateNode: handleNodeUpdate }
        }]);
        return;
      }

      // Handle File Drag (Desktop)
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
          for (const file of files) {
            try {
               toast.loading(`Uploading ${file.name}...`, { id: 'upload-toast' });
               const uploaded = await uploadFile(projectId, file, getToken, { category: 'asset' });
               
               let mediaUrl = null;
               if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                    const previewData = await getFilePreviewUrl(projectId, uploaded.fileId, getToken);
                    mediaUrl = previewData.previewUrl;
               }
    
               let sceneType = 'file';
               if (file.type.startsWith('image/')) sceneType = 'image';
               else if (file.type.startsWith('video/')) sceneType = 'video';
    
               const newScene = await storyboardApi.createScene(projectId, {
                    type: sceneType,
                    position: { x: position.x + (Math.random() * 50), y: position.y + (Math.random() * 50) },
                    content: file.name,
                    metadata: { fileId: uploaded.fileId, mediaUrl, mimeType: file.type }
               }, getToken);

               setNodes((nds) => [...nds, {
                    id: newScene._id,
                    type: 'default',
                    position: newScene.position,
                    data: { label: newScene.content || newScene.metadata?.label || '', ...newScene, updateNode: handleNodeUpdate }
               }]);
    
               toast.success('File added to storyboard', { id: 'upload-toast' });
            } catch (e) {
                console.error(e);
                toast.error(`Failed to upload ${file.name}`, { id: 'upload-toast' });
            }
          }
      }
    },
    [projectId, permissions.canEdit, getToken, reactFlowInstance, handleNodeUpdate]
  );

  const handleContextMenuCapture = useCallback((event) => {
      // Catch-all for multi-selection
      const selectedNodes = reactFlowInstance?.getNodes().filter(n => n.selected) || [];
      if (selectedNodes.length > 1) {
          event.preventDefault();
          event.stopPropagation();
          const pane = reactFlowWrapper.current.getBoundingClientRect();
          setMenu({
             id: selectedNodes[0].id,
             selectedIds: selectedNodes.map(n => n.id),
             top: event.clientY - pane.top,
             left: event.clientX - pane.left,
             type: 'multiselect',
             data: { count: selectedNodes.length }
           });
      }
  }, [reactFlowInstance]);

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
        onContextMenuCapture={handleContextMenuCapture}
      >
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={onMenuClose}
            // onDragOver/onDrop moved to parent for better hit testing
            fitView
            snapToGrid={true}
            snapGrid={[20, 20]}
            deleteKeyCode={['Backspace', 'Delete']}
            selectionOnDrag={true}
            panOnDrag={[1, 2]}
            panOnScroll={true}
            selectionMode="partial"
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
      <StoryboardAssetsPanel projectId={projectId} />
      {menu && <ContextMenu {...menu} onClose={onMenuClose} onAction={handleMenuAction} />}
    </div>
  );
}
