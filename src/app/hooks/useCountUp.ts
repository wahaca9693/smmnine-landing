"use client";

import { useState, useEffect, useRef } from "react";

function parseTarget(value: string): { target: number; suffix: string } {
  const clean = value.replace(/,/g, "").trim();
  const match = clean.match(/^([0-9.]+)\s*([KkMm+]*)$/);
  if (!match) return { target: Number(clean) || 0, suffix: "" };
  const num = parseFloat(match[1]);
  const suf = match[2].toUpperCase();
  if (suf.includes("K")) return { target: num, suffix: "K+" };
  if (suf.includes("M")) return { target: num, suffix: "M+" };
  return { target: num, suffix: suf || "+" };
}

export function useCountUp(value: string, duration = 2000) {
  const [count, setCount] = useState(0);
  const { target, suffix } = parseTarget(value);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const startTime = performance.now();
            const animate = (now: number) => {
              const progress = Math.min((now - startTime) / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 3);
              setCount(Number((target * ease).toFixed(1)));
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, suffix, ref };
}
