"use client";

import { useEffect } from "react";

export default function BootstrapClient() {
  useEffect(() => {
    // Ensure bootstrap JS is loaded and available on window
    if (typeof window !== "undefined") {
      if ((window as any).bootstrap) return;
      import("bootstrap/dist/js/bootstrap.bundle.min.js")
        .then((mod) => {
          // Bootstrap UMD bundle assigns itself to window.bootstrap automatically
          // but ensure it in case of module/UMD differences
          if (!(window as any).bootstrap) {
            (window as any).bootstrap = mod.default || mod;
          }
        })
        .catch((err) => console.error("Failed to load Bootstrap JS:", err));
    }
  }, []);
  return null;
}