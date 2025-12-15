import React from 'react';
import { Type, Image as ImageIcon, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToolItem = ({ icon: Icon, label, colorClass, onDragStart, type, payload }) => (
    <div className="group relative flex items-center justify-center">
        <div 
            className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-200",
                "hover:bg-accent text-muted-foreground hover:text-foreground",
                colorClass
            )}
            draggable 
            onDragStart={(e) => onDragStart(e, type, payload)}
        >
            <Icon size={20} strokeWidth={1.5} />
        </div>
        <span className="absolute left-14 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-md border whitespace-nowrap pointer-events-none z-50">
            {label}
        </span>
    </div>
);

export default function StoryboardToolbar() {
  const onDragStart = (event, nodeType, payload = {}) => {
    console.log('Drag Start:', nodeType, payload);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/payload', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'all';
  };

  return (
    <div className="bg-background border-r border-border w-14 flex flex-col items-center py-4 gap-3 z-10">
      <ToolItem 
        icon={StickyNote} 
        label="Sticky Note" 
        type="note" 
        onDragStart={onDragStart}
        colorClass="hover:text-yellow-600 dark:hover:text-yellow-400"
      />
      <ToolItem 
        icon={Type} 
        label="Text" 
        type="scene" 
        payload={{ type: 'text', label: 'Text Block' }}
        onDragStart={onDragStart}
      />
      <ToolItem 
        icon={ImageIcon} 
        label="Image" 
        type="image" 
        onDragStart={onDragStart}
      />
    </div>
  );
}
