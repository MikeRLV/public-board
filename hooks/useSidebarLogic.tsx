"use client";
import { useState, useEffect } from "react";

export function useSidebarLogic(props: any) {
  const [townInput, setTownInput] = useState("");
  const [textScale, setTextScale] = useState(1.0);
  const [theme, setThemeState] = useState("default");

  // PERSISTENCE: Hydrate all settings on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedScale = localStorage.getItem("blocal_text_scale");
    if (savedScale) setTextScale(parseFloat(savedScale));

    const savedTowns = localStorage.getItem("blocal_active_towns");
    if (savedTowns && typeof props?.setActiveTowns === 'function') {
      try {
        const parsed = JSON.parse(savedTowns);
        if (Array.isArray(parsed) && parsed.length > 0) {
          props.setActiveTowns(parsed);
        }
      } catch (e) { 
        console.error("Corrupt cache cleared.");
        localStorage.removeItem("blocal_active_towns");
      }
    }

    const savedTheme = localStorage.getItem("blocal_theme") || "default";
    setThemeState(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []); // Removed setActiveTowns from dependency to prevent infinite loops during hydration

  // PERSISTENCE: Sync changes
  useEffect(() => {
    localStorage.setItem("blocal_text_scale", textScale.toString());
  }, [textScale]);

  useEffect(() => {
    if (props?.activeTowns) {
      localStorage.setItem("blocal_active_towns", JSON.stringify(props.activeTowns));
    }
  }, [props?.activeTowns]);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem("blocal_theme", newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const handleAddTown = (val: string) => {
    const slug = slugify(val);
    if (!slug || typeof props?.setActiveTowns !== 'function') return;
    
    // SAFETY: Ensure we have an array to work with
    const currentActive = props.activeTowns || [];
    
    if (!currentActive.includes(slug)) {
      props.setActiveTowns([...currentActive, slug]);
    }
    setTownInput("");
  };

  const adjustScale = (delta: number) => {
    setTextScale(prev => Math.min(1.5, Math.max(0.7, prev + delta)));
  };

  return {
    townInput, setTownInput, textScale, adjustScale, handleAddTown,
    theme, setTheme,
    // This allows all sidebar components to scale together
    scaled: (px: number) => ({ fontSize: `calc(${px}px * ${textScale})` })
  };
}