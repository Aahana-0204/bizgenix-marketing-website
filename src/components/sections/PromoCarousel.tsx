"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, Pause, Play, Sparkles } from "lucide-react";
import { promotions } from "./promotions";
export function PromoCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => { if (paused || hover || focus || reduced) return; const timer = setInterval(() => setIndex(value => (value + 1) % promotions.length), 6500); return () => clearInterval(timer); }, [paused, hover, focus, reduced]);
  const promo = promotions[index];
  return <section className="promo container" aria-label="Featured updates" aria-roledescription="carousel" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocusCapture={() => setFocus(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false); }}><span className="promo-icon"><Sparkles /></span><div><p className="eyebrow">{promo.eyebrow}</p><h2>{promo.title}</h2><p>{promo.description}</p></div><Link href={promo.href} className="text-link">{promo.cta} <ArrowUpRight size={18} /></Link><div className="carousel-controls">{promotions.map((item, i) => <button key={item.title} aria-label={`Show promotion ${i + 1}`} aria-pressed={i === index} className={index === i ? "active" : ""} onClick={() => setIndex(i)} />)}<button className="pause" aria-label={paused ? "Play promotions" : "Pause promotions"} onClick={() => setPaused(!paused)}>{paused ? <Play size={12} /> : <Pause size={12} />}</button></div></section>;
}
