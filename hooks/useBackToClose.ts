"use client";
import { useEffect, useRef } from "react";

// Makes the phone/browser Back button close the topmost open overlay
// (sidebar, modals) instead of leaving the site.
//
// Each open overlay pushes a same-URL history entry. Back pops it and we
// close the overlay; closing via the UI ("X", backdrop) pops the entry
// ourselves so the history stack stays in sync.

type Entry = { close: () => void; pushed: boolean; popped: boolean };

const MARKER = "__overlay";
const stack: Entry[] = [];
let pendingSelfPops = 0;
let listening = false;

function pushEntry(entry: Entry) {
  entry.pushed = true;
  window.history.pushState({ ...window.history.state, [MARKER]: true }, "");
}

function onPopState() {
  if (pendingSelfPops > 0) {
    // This pop was our own history.back(); now it's safe to push entries
    // for overlays that opened while it was in flight.
    if (--pendingSelfPops === 0) stack.filter(e => !e.pushed).forEach(pushEntry);
    return;
  }
  const top = stack.pop();
  if (top) {
    top.popped = true;
    top.close();
  }
}

export function useBackToClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }

    const entry: Entry = { close: () => onCloseRef.current(), pushed: false, popped: false };
    stack.push(entry);
    if (pendingSelfPops === 0) pushEntry(entry);

    return () => {
      if (entry.popped) return;
      // Closed via the UI: drop our history entry so Back doesn't need an extra press.
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      if (entry.pushed && window.history.state?.[MARKER]) {
        pendingSelfPops++;
        window.history.back();
      }
    };
  }, [isOpen]);
}
