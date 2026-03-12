"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { createClient } from "@supabase/supabase-js";

dayjs.extend(isSameOrAfter);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const renderDescriptionWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-[var(--primary)] font-bold underline hover:opacity-80 transition-opacity"
          onClick={ev => ev.stopPropagation()}>
          TICKET LINK (EXTERNAL SITE, PROCEED WITH CAUTION)
        </a>
      );
    }
    return part;
  });
};

function PortalDropdown({ inputRef, suggestions, onSelect, visible }: {
  inputRef: React.RefObject<HTMLInputElement>;
  suggestions: { name: string; count?: number }[];
  onSelect: (s: string) => void;
  visible: boolean;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    }
  };

  useLayoutEffect(() => {
    if (!visible) return;
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [visible, suggestions]);

  if (!visible || suggestions.length === 0) return null;

  return createPortal(
    <div
      style={{ top: coords.top, left: coords.left, width: coords.width, zIndex: 99999 }}
      className="fixed bg-neutral-900 border border-neutral-700 shadow-2xl max-h-44 overflow-y-auto"
    >
      {suggestions.map((s, i) => (
        <div
          key={`${s.name}-${i}`}
          onMouseDown={e => { e.preventDefault(); onSelect(s.name); }}
          className="px-3 py-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-neutral-800 hover:text-[var(--primary)] text-white border-b border-white/5 last:border-0 transition-colors flex items-center justify-between"
        >
          <span>#{s.name}</span>
          {s.count != null && s.count > 1 && (
            <span className="text-[9px] font-mono text-neutral-500 ml-2">×{s.count}</span>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}

function AutocompleteInput({ value, onChange, onSelect, fetchSuggestions, fetchDefault, placeholder, scaled }: any) {
  const [suggestions, setSuggestions] = useState<{ name: string; count?: number }[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value.trim()) return;
    const timer = setTimeout(async () => {
      const results = await fetchSuggestions(value.trim());
      setSuggestions(results);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const handleFocus = async () => {
    setFocused(true);
    if (!value.trim() && fetchDefault) {
      const results = await fetchDefault();
      setSuggestions(results);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setFocused(false);
      if (!value.trim()) setSuggestions([]);
    }, 150);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', ...scaled(11) }}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full border p-2 outline-none focus:border-[var(--primary)] text-xs font-bold uppercase rounded-sm text-[var(--text-main)]"
      />
      <PortalDropdown
        inputRef={inputRef}
        suggestions={suggestions}
        visible={focused && suggestions.length > 0}
        onSelect={s => {
          onSelect(s);
          setSuggestions([]);
        }}
      />
    </div>
  );
}

export function DayDetailsModal({ activeDay, events, onClose, onVote, onPostClick }: any) {
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [newLocalInput, setNewLocalInput] = useState<Record<string, string>>({});
  const [projecting, setProjecting] = useState<Record<string, boolean>>({});

  const scaled = (base: number) => ({ fontSize: `calc(${base}px * var(--text-scale, 1))` });

  const dayEvents = events.filter((e: any) => {
    const start = dayjs(e.event_start).format('YYYY-MM-DD');
    const end = e.event_end ? dayjs(e.event_end).format('YYYY-MM-DD') : start;
    return activeDay >= start && activeDay <= end;
  });

  const aggregateTags = (data: any[]): { name: string; count: number }[] => {
    const map = new Map<string, number>();
    for (const t of data) {
      const name = t.tags?.name;
      if (!name) continue;
      map.set(name, (map.get(name) || 0) + (t.vote_count || 1));
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const fetchTagSuggestions = async (search: string): Promise<{ name: string; count: number }[]> => {
    const { data, error } = await supabase
      .from('flyer_tags').select('vote_count, tags(name)').ilike('tags.name', `%${search}%`).limit(50);
    if (error || !data) return [];
    return aggregateTags(data).slice(0, 8);
  };

  const fetchDefaultTags = async (): Promise<{ name: string; count: number }[]> => {
    const { data, error } = await supabase
      .from('flyer_tags').select('vote_count, tags(name)').order('vote_count', { ascending: false }).limit(100);
    if (error || !data) return [];
    return aggregateTags(data).slice(0, 10);
  };

  const fetchLocalSuggestions = async (search: string): Promise<{ name: string }[]> => {
    const { data, error } = await supabase
      .from('weighted_locals').select('name').ilike('name', `%${search}%`).limit(8);
    if (error || !data) return [];
    return data.map((t: any) => ({ name: t.name }));
  };

  const fetchDefaultLocals = async (): Promise<{ name: string }[]> => {
    const { data, error } = await supabase
      .from('weighted_locals').select('name').order('weight', { ascending: false }).limit(10);
    if (error || !data) return [];
    return data.map((t: any) => ({ name: t.name }));
  };

  const votedValue = (eventTitle: string, tagName: string): number | null => {
    const v = localStorage.getItem(`voted:${eventTitle.toLowerCase()}:${tagName}`);
    return v !== null ? parseInt(v) : null;
  };

  const handleAddTag = async (flyerId: string) => {
    const val = tagInput[flyerId]?.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (!val) return;
    const userId = localStorage.getItem("local_user_id");

    const thisEvent = events.find((e: any) => e.id === flyerId);
    const lockKey = thisEvent ? `voted:${thisEvent.title.toLowerCase()}:${val}` : null;

    const { data: siblings } = thisEvent
      ? await supabase.from('flyers').select('id').eq('title', thisEvent.title)
      : { data: [{ id: flyerId }] };

    const targets = siblings?.length ? siblings : [{ id: flyerId }];

    await Promise.all(targets.map((f: any) =>
      supabase.rpc('vote_on_tag', {
        target_flyer_id: f.id,
        target_tag_name: val,
        vote_val: 1,
        voter_id: userId
      })
    ));

    if (lockKey) localStorage.setItem(lockKey, '1');
    setTagInput(prev => ({ ...prev, [flyerId]: "" }));
    onVote();
  };

  const handleAddToOtherLocal = async (e: any) => {
    const targetLocal = newLocalInput[e.id]?.trim().toLowerCase().replace(/\s+/g, '-');
    if (!targetLocal || projecting[e.id]) return;
    setProjecting(prev => ({ ...prev, [e.id]: true }));
    try {
      const currentSlugs = Array.isArray(e.city_slug) ? e.city_slug : (e.city_slug ? [e.city_slug] : []);
      const updatedSlugs = Array.from(new Set([...currentSlugs, targetLocal]));
      const { error } = await supabase.from("flyers").upsert({
        title: e.title,
        description: e.description,
        event_start: e.event_start,
        price: e.price,
        image_url: e.image_url,
        location_name: e.location_name,
        city_slug: updatedSlugs,
      }, { onConflict: 'title' });
      if (error) throw error;
      alert(`Event added to ${targetLocal.replace(/-/g, ' ')} LoCAL.`);
      setNewLocalInput(prev => ({ ...prev, [e.id]: "" }));
      onVote();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProjecting(prev => ({ ...prev, [e.id]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4 font-mono" onClick={onClose}>
      <div
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        className="w-full max-w-5xl h-[95vh] md:h-[85vh] border rounded-xl flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex flex-col">
            <div style={{ border: '1px solid var(--primary)', display: 'inline-block' }} className="px-3 py-1 mb-1">
              <h2 style={{ ...scaled(18), color: 'var(--primary)' }} className="font-bold uppercase leading-none">Event Info</h2>
            </div>
            <span style={scaled(10)} className="text-[var(--text-muted)] uppercase tracking-widest mt-1">
              {dayjs(activeDay).format('MMMM D, YYYY')}
            </span>
          </div>
          <button onClick={onClose} className="text-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors leading-none">×</button>
        </div>

        {/* pt-1 so card sits flush under header, normal padding everywhere else */}
        <div className="flex-1 overflow-y-auto pt-1 px-4 pb-4 md:px-8 md:pb-8 space-y-8 md:space-y-12 custom-scrollbar">
          {dayEvents.map((e: any) => {
            const sortedTags = [...(e.flyer_tags || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
            return (
              <div key={e.id} className="bg-black/20 rounded-lg border border-white/5 p-4 md:p-12 shadow-2xl flex flex-col">

                {/* Top section — two columns */}
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 flex-1">

                  {/* Left column */}
                  <div className="w-full md:w-2/5 flex flex-col">

                    {/* Title + location + price + poster — all sticky together */}
                    <div className="sticky top-0 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(85vh - 5rem)' }}>
                      <div className="px-4 py-3 text-center mb-3" style={{ border: '1px solid var(--primary)' }}>
                        <h3 style={{ ...scaled(36), color: 'var(--primary)' }} className="font-black uppercase leading-[0.9] tracking-tighter break-words">
                          {e.title}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-2 mb-4">
                        <div style={scaled(13)} className="font-black tracking-tighter uppercase leading-none">
                          <span style={{ color: 'var(--primary)', opacity: 0.5 }} className="mr-2">LOCATION:</span>
                          <span className="text-[var(--text-main)] uppercase">{e.location_name}</span>
                        </div>
                        <div style={scaled(13)} className="font-black tracking-tighter uppercase leading-none">
                          <span style={{ color: 'var(--primary)', opacity: 0.5 }} className="mr-2">PRICE:</span>
                          <span className="text-[var(--text-main)] uppercase">{e.price || 'FREE'}</span>
                        </div>
                      </div>
                      <div className="relative group flex-1 min-h-0 flex items-center justify-center">
                        {e.image_url ? (
                          <img src={e.image_url} alt="Flyer"
                            style={{ borderColor: 'var(--border-color)' }}
                            className="w-full max-h-full object-contain shadow-[0_0_30px_rgba(0,0,0,0.5)] border" />
                        ) : (
                          <div style={scaled(10)} className="w-full h-48 md:h-64 bg-black/40 flex items-center justify-center border border-white/5 italic text-[var(--text-muted)] uppercase tracking-tighter">
                            No Flyer Projected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex-1 flex flex-col w-full pt-4 md:pt-2">
                    <p style={scaled(15)} className="text-[var(--text-main)] opacity-80 leading-relaxed whitespace-pre-wrap font-sans">
                      {renderDescriptionWithLinks(e.description)}
                    </p>
                  </div>
                </div>

                {/* Shared bottom row — one divider, two columns perfectly aligned */}
                <div className="border-t border-white/5 mt-8 pt-6 flex flex-col md:flex-row gap-8 md:gap-12">

                  {/* Left bottom: Add to LoCAL only */}
                  <div className="w-full md:w-2/5 flex flex-col justify-end">
                    <div className="flex gap-2">
                      <AutocompleteInput
                        value={newLocalInput[e.id] || ""}
                        placeholder="Add to other LoCAL"
                        fetchSuggestions={fetchLocalSuggestions}
                        fetchDefault={fetchDefaultLocals}
                        scaled={scaled}
                        onChange={(val: string) => setNewLocalInput(prev => ({ ...prev, [e.id]: val }))}
                        onSelect={(val: string) => setNewLocalInput(prev => ({ ...prev, [e.id]: val }))}
                      />
                      <button
                        onClick={() => handleAddToOtherLocal(e)}
                        style={{ ...scaled(10), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
                        className={`px-3 py-2 font-black uppercase rounded-sm transition-all shrink-0 ${projecting[e.id] ? 'opacity-50' : 'hover:opacity-80 active:scale-95'}`}>
                        {projecting[e.id] ? '...' : '+ LoCAL'}
                      </button>
                    </div>
                  </div>

                  {/* Right bottom: tags + add tag + spam */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      {sortedTags.map((ft: any) => (
                        <div key={ft.tags?.name} className="bg-black/40 border border-white/10 px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-2 md:gap-3 rounded-md hover:border-[var(--primary)]/40 transition-all">
                          <span style={scaled(10)} className="text-[var(--text-muted)] font-bold uppercase">{ft.tags?.name}</span>
                          <span style={{ ...scaled(10), color: 'var(--primary)' }} className="font-black border-l border-white/10 pl-2 md:pl-3">{ft.vote_count}</span>
                          <div className="flex gap-2 ml-1 text-[var(--text-main)]">
                            {(() => {
                              const voted = votedValue(e.title, ft.tags?.name);
                              const plusLocked = voted === 1;
                              const minusLocked = voted === -1;
                              return <>
                                <button
                                  onClick={() => !plusLocked && onVote(e.id, ft.tags?.name, 1)}
                                  className={`text-xs font-bold transition-all transform ${plusLocked ? 'text-green-400 opacity-40 cursor-not-allowed' : 'hover:text-green-400 hover:scale-125'}`}
                                >+</button>
                                <button
                                  onClick={() => !minusLocked && onVote(e.id, ft.tags?.name, -1)}
                                  className={`text-xs font-bold transition-all transform ${minusLocked ? 'text-red-400 opacity-40 cursor-not-allowed' : 'hover:text-red-400 hover:scale-125'}`}
                                >-</button>
                              </>;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <AutocompleteInput
                        value={tagInput[e.id] || ""}
                        placeholder="New Tag"
                        fetchSuggestions={fetchTagSuggestions}
                        fetchDefault={fetchDefaultTags}
                        scaled={scaled}
                        onChange={(val: string) => setTagInput(prev => ({ ...prev, [e.id]: val }))}
                        onSelect={(val: string) => setTagInput(prev => ({ ...prev, [e.id]: val }))}
                      />
                      <button
                        onClick={() => handleAddTag(e.id)}
                        style={{ ...scaled(11), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
                        className="px-4 py-2 font-black uppercase transition-all rounded-sm hover:opacity-80 shrink-0">
                        Add
                      </button>
                      <div className="w-px h-6 bg-white/20 mx-3 shrink-0" />
                      <button onClick={() => onVote(e.id, 'spam', 1)} style={scaled(9)}
                        className="bg-red-700 text-white px-3 py-1 hover:bg-red-600 transition-all uppercase font-black rounded-sm tracking-widest shrink-0">
                        Report Spam
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ borderColor: 'var(--primary)' }} className="border border-dashed border-opacity-40 rounded-lg p-8 bg-white/[0.03] flex flex-col items-center justify-center gap-4">
            <p style={scaled(10)} className="text-[var(--text-muted)] uppercase tracking-[0.3em] font-black text-center">
              {dayjs(activeDay).isBefore(dayjs().startOf('day')) ? "Past days cannot be updated" : "Know of something else happening on this day?"}
            </p>
            {dayjs(activeDay).isSameOrAfter(dayjs().startOf('day')) && (
              <button onClick={() => { onClose(); onPostClick(activeDay); }}
                style={{ ...scaled(11), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
                className="px-10 py-3 rounded-sm font-black uppercase shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all hover:opacity-90 hover:scale-105 active:scale-95 border border-white/10">
                + Post Flyer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
