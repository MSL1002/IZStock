export const TOOLS = [
  { id: 'select',  label: 'Select',  key: '1' },
  { id: 'section', label: 'Section', key: '2' },
  { id: 'aisle',   label: 'Aisle',   key: '3' },
  { id: 'shelf',   label: 'Shelf',   key: '4' },
];

export const TOOL_HINTS = {
  section: 'Click to place corners. Click the first corner, double-click, or press Enter to finish. Backspace removes the last corner.',
  aisle: 'Drag inside a section to draw an aisle.',
  shelf: 'Drag inside an aisle to draw a shelf.',
};

export const isDrawTool = (id) => id !== 'select';