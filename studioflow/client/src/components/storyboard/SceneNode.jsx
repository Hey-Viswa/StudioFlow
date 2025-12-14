import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FileIcon, ImageIcon, VideoIcon, StickyNote } from 'lucide-react';

const SceneNode = ({ data, selected }) => {
  const { type = 'note', label, content, mediaUrl, fileId, metadata, style } = data;
  const isResizable = selected && (type === 'image' || type === 'video' || type === 'note');

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
        return (
          <div className="p-4 h-full text-xl text-slate-800 whitespace-pre-wrap leading-tight" style={{ fontFamily: '"Patrick Hand", cursive' }}>
            {content || label || 'New Note'}
          </div>
        );
    }
  };

  return (
    <>
        <NodeResizer 
            isVisible={selected} 
            minWidth={160} 
            minHeight={100}
            lineClassName="border-primary" 
            handleClassName="h-3 w-3 bg-white border-2 border-primary rounded"
        />
        <Card className={cn(
            "shadow-md bg-white border-2 border-transparent transition-all h-full",
            selected && "border-primary shadow-xl",
            type === 'note' && "bg-yellow-50 border-yellow-200"
        )}
        style={{ width: '100%', height: '100%' }} // ReactFlow controls dimensions via style prop on wrapper, so we fill it
        >
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
        
        {(type !== 'note' && type !== 'image' && type !== 'video') && (
            <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm font-medium line-clamp-1 flex items-center gap-2">
                    {type === 'file' && <FileIcon size={14} />}
                    {label}
                </CardTitle>
            </CardHeader>
        )}

        <CardContent className={cn("p-3 h-full", (type === 'image' || type === 'video') && "p-0")}>
            {renderContent()}
        </CardContent>
        
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
        </Card>
    </>
  );
};

export default memo(SceneNode);
