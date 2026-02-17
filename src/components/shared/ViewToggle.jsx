import { LayoutGrid, Table } from 'lucide-react';

const PRIMARY = '#e94f1c';

export default function ViewToggle({ viewMode, onChange }) {
  return (
    <div className="flex bg-white border border-[#e5dedc] rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => onChange('cards')}
        className="px-3 py-2 transition-colors"
        style={viewMode === 'cards' ? { backgroundColor: PRIMARY, color: 'white' } : { color: '#886c63' }}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('table')}
        className="px-3 py-2 transition-colors"
        style={viewMode === 'table' ? { backgroundColor: PRIMARY, color: 'white' } : { color: '#886c63' }}
      >
        <Table className="w-4 h-4" />
      </button>
    </div>
  );
}