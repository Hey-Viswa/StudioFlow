import React, { useEffect, useRef } from 'react';
import { Trash2, Copy, Lock, Unlock, FileText, Type, ArrowUp, ArrowDown, Group } from 'lucide-react';

export default function ContextMenu({ 
    id, 
    top, 
    left, 
    right, 
    bottom, 
    type, // 'scene', 'edge', 'pane'
    data, // the object data (scene or edge)
    onClose,
    onAction 
}) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const handleAction = (action) => {
      onAction(action, data);
      onClose();
  };

  const style = { top, left, right, bottom };

  return (
    <div 
        ref={ref} 
        style={style} 
        className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg w-48 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100"
    >
      {type === 'scene' && (
        <>
            <button 
                onClick={() => handleAction('duplicate')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                <Copy size={16} /> Duplicate <span className="ml-auto text-xs text-slate-400">Ctrl+D</span>
            </button>
            <button 
                onClick={() => handleAction('toggleLock')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                {data.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                {data.isLocked ? "Unlock" : "Lock"}
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <button 
                onClick={() => handleAction('delete')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                disabled={data.isLocked}
                style={{ opacity: data.isLocked ? 0.5 : 1 }}
            >
                <Trash2 size={16} /> Delete <span className="ml-auto text-xs text-slate-400">Del</span>
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <button 
                onClick={() => handleAction('bringToFront')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                <ArrowUp size={16} /> Bring to Front
            </button>
            <button 
                onClick={() => handleAction('sendToBack')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                <ArrowDown size={16} /> Send to Back
            </button>
        </>
      )}

      {type === 'edge' && (
        <>
            <button 
                onClick={() => handleAction('delete')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
            >
                <Trash2 size={16} /> Delete
            </button>
        </>
      )}

      {type === 'pane' && (
        <>
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Insert</div>
            <button 
                onClick={() => handleAction('createNote')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                <FileText size={16} /> Add Note
            </button>
            <button 
                onClick={() => handleAction('createText')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                <Type size={16} /> Add Text
            </button>
        </>
      )}
    
      {type === 'multiselect' && (
        <>
             <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{data.count} Selected</div>
             <button 
                onClick={() => handleAction('groupSelection')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                <Group size={16} /> Group Selection
            </button>
            <button 
                onClick={() => handleAction('duplicate')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
            >
                <Copy size={16} /> Duplicate All
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <button 
                onClick={() => handleAction('delete')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
            >
                <Trash2 size={16} /> Delete All
            </button>
        </>
      )}
    </div>
  );
}
