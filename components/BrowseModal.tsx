"use client";
import { useState, useEffect, useMemo } from "react";

type BrowseType = 'locals' | 'trending' | 'all-tags';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: BrowseType;
  // locals mode
  weightedLocals?: { name: string; weight: number }[];
  activeTowns?: string[];
  onAddTown?: (loc: string) => void;
  onRemoveTown?: (loc: string) => void;
  // trending + all-tags mode
  weightedTags?: { name: string; weight: number }[];
  allTimeTags?: { name: string; count: number }[];
  activeTags?: string[];
  setActiveTags?: (tags: string[]) => void;
}

const TYPE_CONFIG = {
  locals: {
    title: 'LoCALs',
    subtitle: 'All available neighborhoods',
    emptyMsg: 'No LoCALs found.',
  },
  trending: {
    title: 'Trending',
    subtitle: 'Tags active this month',
    emptyMsg: 'No trending tags this month.',
  },
  'all-tags': {
    title: 'All Tags',
    subtitle: 'Every tag ever used',
    emptyMsg: 'No tags found.',
  },
};

export function BrowseModal({
  isOpen, onClose, type,
  weightedLocals = [], activeTowns = [], onAddTown, onRemoveTown,
  weightedTags = [], allTimeTags = [], activeTags = [], setActiveTags,
}: BrowseModalProps) {
  const [search, setSearch] = useState('');
  const config = TYPE_CONFIG[type];

  // Reset search when type or open state changes
  useEffect(() => { setSearch(''); }, [type, isOpen]);

  const items = useMemo(() => {
    if (type === 'locals') {
      return weightedLocals
        .map(l => ({ name: l.name, meta: '' }))
        .filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (type === 'trending') {
      return weightedTags
        .map(t => ({ name: t.name, meta: `+${t.weight}` }))
        .filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    }
    // all-tags: sorted by count descending
    return [...allTimeTags]
      .sort((a, b) => b.count - a.count)
      .map(t => ({ name: t.name, meta: t.count > 1 ? `×${t.count}` : '' }))
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [type, weightedLocals, weightedTags, allTimeTags, search]);

  const isActive = (name: string) => {
    if (type === 'locals') return activeTowns.includes(name);
    return activeTags.includes(name);
  };

  const handleToggle = (name: string) => {
    if (type === 'locals') {
      if (activeTowns.includes(name)) {
        onRemoveTown?.(name);
      } else {
        onAddTown?.(name);
      }
      return;
    }
    // tags
    if (!setActiveTags) return;
    if (activeTags.includes(name)) {
      setActiveTags(activeTags.filter(t => t !== name));
    } else {
      setActiveTags([...activeTags, name]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        className="w-full max-w-sm border rounded-xl flex flex-col overflow-hidden shadow-2xl max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-1">
            <h2
              style={{ color: 'var(--primary)' }}
              className="text-xl font-black uppercase tracking-tighter leading-none"
            >
              {config.title}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-lg font-black leading-none"
            >
              ✕
            </button>
          </div>
          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-3">
            {config.subtitle}
          </p>
          {/* Search */}
          <input
            autoFocus
            type="text"
            placeholder={`Search ${config.title.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            className="w-full border p-2 text-[var(--text-main)] text-xs focus:border-[var(--primary)] outline-none transition-colors"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="px-5 py-8 text-center text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">
              {search ? `No results for "${search}"` : config.emptyMsg}
            </div>
          ) : (
            items.map((item) => {
              const active = isActive(item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => handleToggle(item.name)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left border-b transition-colors hover:bg-white/5 group"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Active indicator */}
                    <div
                      style={{
                        borderColor: active ? 'transparent' : 'var(--border-color)',
                        backgroundColor: active ? 'var(--primary)' : 'transparent',
                      }}
                      className="w-3 h-3 border shrink-0 transition-all"
                    />
                    <span
                      className="text-[11px] font-bold uppercase truncate transition-colors"
                      style={{ color: active ? 'var(--primary)' : 'var(--text-main)' }}
                    >
                      {type === 'trending' || type === 'all-tags' ? `#${item.name}` : item.name}
                    </span>
                  </div>
                  {item.meta && (
                    <span className="text-[9px] font-mono text-[var(--text-muted)] shrink-0 ml-2">
                      {item.meta}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer: active count + clear */}
        {type !== 'locals' && activeTags.length > 0 && (
          <div
            className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">
              {activeTags.length} active
            </span>
            <button
              onClick={() => setActiveTags?.([])}
              className="text-[10px] font-black uppercase text-[var(--primary)] hover:opacity-70 transition-opacity tracking-widest"
            >
              Clear all
            </button>
          </div>
        )}
        {type === 'locals' && activeTowns.length > 0 && (
          <div
            className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">
              {activeTowns.length} selected
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
