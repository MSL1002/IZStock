import { useEffect } from 'react';
import { useMapEditor } from '../MapEditorProvider';
import { TOOLS } from '../tools';

export function useEditorShortcuts() {
  const { actions } = useMapEditor();

  useEffect(() => {
    const onKey = (e) => {
        // don't allow key-binds when delete confirmation is up
        if(document.querySelector('.modal.show')) return;
        // Don't hijack typing in the properties panel
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            e.shiftKey ? actions.redo() : actions.undo();
        } 
        else if (mod && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            actions.redo();
        } 
        else if (e.key === 'Escape') {
            actions.setTool('select');
        } 
        else if (!mod && !e.altKey) {
            const tool = TOOLS.find((t) => t.key === e.key);
            if (tool) actions.setTool(tool.id);
        }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);
}