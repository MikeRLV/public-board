"use client";
import { useState, useEffect, useCallback } from "react";

export function useLoCALData() {
  const [activeTowns, setActiveTowns] = useState<string[]>([]);

  // Hydrate from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("blocal_active_towns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setActiveTowns(parsed);
      } catch (e) {
        localStorage.removeItem("blocal_active_towns");
      }
    }
  }, []);

  // Save to LocalStorage whenever towns change
  useEffect(() => {
    localStorage.setItem("blocal_active_towns", JSON.stringify(activeTowns));
  }, [activeTowns]);

  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const addTown = useCallback((name: string) => {
    const slug = slugify(name);
    if (slug) {
      setActiveTowns(prev => {
        if (prev.includes(slug)) return prev;
        return [...prev, slug]; // Functional update prevents stale state bugs
      });
    }
  }, []);

  const removeTown = useCallback((slug: string) => {
    setActiveTowns(prev => prev.filter(t => t !== slug));
  }, []);

  return { activeTowns, addTown, removeTown };
}