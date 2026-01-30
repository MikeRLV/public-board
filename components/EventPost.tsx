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

  // Pure Text State (No Files)
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");

  const handleSave = async () => {
    if (!title || !eventDate) {
      alert("Please enter a Title and Date.");
      return;
    }

    setIsSaving(true);

    try {
      // Direct Database Insert (No Storage/Images needed)
      const { error } = await supabase.from("flyers").insert({
        city_slug: city,
        location_name: title,           // We use this as the Event Title
        event_start: new Date(eventDate).toISOString(),
        image_url: null                 // Explicitly null
      });

      if (error) throw error;

      // Success! Reset and Close
      setIsOpen(false);
      setTitle("");
      setEventDate("");
      router.refresh(); // Refresh the calendar
      
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
        className="bg-white text-black px-4 py-2 font-bold uppercase text-sm hover:bg-neutral-200 transition rounded-sm"
      >
        + Add Event
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-lg max-w-md w-full relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 text-white">Add to Calendar</h2>
            <div className="space-y-4">
              
              {/* TITLE INPUT */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. 8pm Jazz at The Dive"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-800 text-white p-2 rounded border border-neutral-700 focus:border-yellow-500 outline-none"
                  autoFocus
                />
              </div>

              {/* DATE INPUT */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-neutral-800 text-white p-2 rounded border border-neutral-700 color-scheme-dark"
                />
              </div>

              {/* SAVE BUTTON */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-yellow-500 text-black font-bold py-3 rounded mt-4 hover:bg-yellow-400 disabled:opacity-50"
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