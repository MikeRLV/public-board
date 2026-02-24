"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Connect to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function EventPost({ city }: { city: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");

  const handleSave = async () => {
    if (!title || !eventDate) {
      alert("Please enter a Title and Date.");
      return;
    }

    setIsSaving(true);

    try {
      // 1. USE UPSERT TO PREVENT DUPLICATES
      // This checks if 'location_name' already exists.
      // If it does, it updates the original flyer instead of creating a new one.
      const { error } = await supabase.from("flyers").upsert(
        {
          city_slug: city,
          location_name: title,           // Used as the unique identifier/title
          event_start: new Date(eventDate).toISOString(),
          image_url: null                 
        }, 
        { onConflict: 'location_name' }   // Targets your Unique Constraint
      );

      if (error) throw error;

      // Success! Reset and Close
      setIsOpen(false);
      setTitle("");
      setEventDate("");
      router.refresh(); 
      
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
        className="px-4 py-2 font-bold uppercase text-sm hover:opacity-80 transition-all rounded-sm shadow-lg active:scale-95"
      >
        + Add Event
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[130] p-4 transition-all"
          onClick={() => setIsOpen(false)}
        >
          <div 
            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            className="border p-6 rounded-lg max-w-md w-full relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              ✕
            </button>

            <h2 style={{ color: 'var(--primary)' }} className="text-xl font-black uppercase tracking-tighter mb-4">
              Add to Calendar
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8pm Jazz at The Dive"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                  className="w-full text-[var(--text-main)] p-2 rounded border focus:border-[var(--primary)] outline-none transition-colors placeholder:text-neutral-700"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                  className="w-full text-[var(--text-main)] p-2 rounded border focus:border-[var(--primary)] outline-none transition-colors color-scheme-dark"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{ 
                  backgroundColor: isSaving ? 'var(--text-muted)' : 'var(--primary)', 
                  color: 'var(--bg-main)' 
                }}
                className="w-full font-black py-3 rounded mt-4 hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-widest text-sm"
              >
                {isSaving ? "Saving..." : "POST EVENT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}