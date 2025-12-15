import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { cn } from '@/lib/utils';
import { FileIcon, ImageIcon, VideoIcon } from 'lucide-react';

const SceneNode = ({ id, data, selected }) => {
  const { type = 'note', label, content, metadata, updateNode, isLocked } = data;
  const mediaUrl = data.mediaUrl || metadata?.mediaUrl;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content || label || '');
  
  useEffect(() => {
      setEditValue(content || label || '');
  }, [content, label]);

  const handleDoubleClick = () => {
      if (isLocked) return;
      if (updateNode) setIsEditing(true);
  };

  const handleBlur = () => {
      setIsEditing(false);
      if (updateNode && editValue !== (content || label)) {
          updateNode(id, { content: editValue });
      }
  };

  const renderContent = () => {
    switch (type) {
      case 'image':
        return (
          <div className="relative w-full h-full min-h-[100px] bg-slate-100 rounded-md overflow-hidden flex items-center justify-center">
            {mediaUrl ? (
              <img src={mediaUrl} alt={label} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-10 h-10 text-slate-400" />
            )}
          </div>
        );
      case 'video':
        return (
            <div className="relative w-full h-full min-h-[100px] bg-slate-900 rounded-md overflow-hidden flex items-center justify-center group">
              {mediaUrl ? (
                <video src={mediaUrl} className="w-full h-full object-cover" controls />
              ) : (
                <VideoIcon className="w-10 h-10 text-slate-400" />
              )}
            </div>
        );
      case 'file':
        return (
            <div className="flex items-center gap-3 p-2 bg-slate-50 border rounded-md">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                    <FileIcon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{label || 'Attached File'}</p>
                    <p className="text-xs text-muted-foreground uppercase">{metadata?.extension || 'FILE'}</p>
                </div>
            </div>
        );
      case 'note':
      default:
        // Handle "scene" type as Text Block (transparent) or default Note
        const isTextBlock = type === 'scene' || (metadata && metadata.type === 'text');
        
        return (
          <div 
            className="h-full w-full"
            onDoubleClick={handleDoubleClick}
          >
            {isEditing ? (
                <textarea
                    autoFocus
                    className="w-full h-full bg-transparent resize-none outline-none p-4 text-xl text-slate-800 leading-tight font-patrick-hand"
                    style={{ fontFamily: '"Patrick Hand", cursive' }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => { 
                        e.stopPropagation(); 
                        if (e.key === 'Escape') {
                            setIsEditing(false);
                            setEditValue(content || label || ''); // Revert
                        }
                    }} 
                />
            ) : (
                <div className="p-4 h-full text-xl text-slate-800 whitespace-pre-wrap leading-tight" style={{ fontFamily: '"Patrick Hand", cursive' }}>
                    {content || label || 'New Note'}
                </div>
            )}
          </div>
        );
    }
  };

  return (
    <> 
        <NodeResizer 
            isVisible={selected && !isLocked} 
            minWidth={160} 
            minHeight={100}
            lineClassName="border-primary" 
            handleClassName="h-3 w-3 bg-white border-2 border-primary rounded"
            onResizeEnd={(_, params) => {
                if (updateNode) {
                    updateNode(id, { dimensions: { width: params.width, height: params.height } });
                }
            }}
        />
        {isLocked && (
            <div className="absolute -top-3 -right-3 z-50 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
        )}
        <div className={cn(
            "relative w-full h-full transition-all rounded-md group",
            (type === 'default' || type === 'file') && "bg-white border-2 border-slate-200 shadow-sm",
            type === 'note' && "bg-yellow-50 border-2 border-yellow-200 shadow-sm",
            (type === 'image' || type === 'video') && "border-2 border-transparent",
            (type === 'scene') && "bg-transparent border-2 border-transparent",
            selected && "border-primary shadow-[0_0_0_2px_rgba(37,99,235,0.2)]",
            isLocked && "opacity-90 grayscale-[0.2]"
        )}
        style={{ width: '100%', height: '100%' }}
        >
        <Handle type="target" position={Position.Top} className={cn("w-4 h-4 -top-2 bg-slate-400 opacity-0 group-hover:opacity-100 transition-opacity z-50", selected && "opacity-100")} />
        
        {(type === 'file' || type === 'default') && (
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                 {type === 'file' && <FileIcon size={14} className="text-slate-500" />}
                 <div onDoubleClick={handleDoubleClick} className="flex-1 cursor-text font-medium text-sm text-slate-700 truncate">
                        {isEditing ? (
                             <input 
                                autoFocus
                                className="w-full bg-transparent outline-none border-b border-primary/50"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={(e) => { 
                                    e.stopPropagation(); 
                                    if(e.key === 'Enter') handleBlur(); 
                                    if (e.key === 'Escape') {
                                        setIsEditing(false);
                                        setEditValue(label || ''); // Revert
                                    }
                                }} 
                             />
                        ) : (
                            label
                        )}
                </div>
            </div>
        )}

        <div className={cn("w-full h-full", (type === 'file' || type === 'default') ? "p-3" : "p-0")}>
            {renderContent()}
        </div>
        
        <Handle type="source" position={Position.Bottom} className={cn("w-4 h-4 -bottom-2 bg-slate-400 opacity-0 group-hover:opacity-100 transition-opacity z-50", selected && "opacity-100")} />
        </div>
    </>
  );
};

export default memo(SceneNode);
