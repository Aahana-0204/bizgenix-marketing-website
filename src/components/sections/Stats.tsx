"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  useEffect(() => { if (!visible || reduced) return; let frame = 0; const start = performance.now(); const tick = (now: number) => { const value = Math.min((now - start) / 1200, 1); setProgress(value); if (value < 1) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [visible, reduced]);
  const amount = reduced ? 1 : progress;
  return <section className="stats-section section-dark"><div className="container"><div className="section-heading"><p className="eyebrow">LESS FRICTION. MORE POSSIBILITY.</p><h2>What better could look like.</h2><p>Illustrative goals we can explore together, measured against your starting point.</p></div><div className="stats-grid" ref={ref}>{[{ n: 3, suffix: "x", label: "More room to grow" }, { n: 70, suffix: "%", label: "Less repetitive work" }, { n: 30, suffix: "s", label: "Faster first responses" }, { n: 24, suffix: "/7", label: "Always-on support" }].map(stat => <div key={stat.label}><strong aria-label={`${stat.n}${stat.suffix}`}>{Math.round(stat.n * amount)}<span>{stat.suffix}</span></strong><p>{stat.label}</p></div>)}</div><p className="stats-disclaimer">Planning examples, not guaranteed results. Outcomes depend on your processes and implementation.</p></div></section>;
}
