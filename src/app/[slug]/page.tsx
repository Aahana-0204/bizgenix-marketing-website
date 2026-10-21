import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookButton } from "@/features/booking/BookingProvider";
import { pages } from "@/lib/content";
export function generateStaticParams() { return Object.keys(pages).map(slug => ({ slug })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const page = pages[slug as keyof typeof pages]; return page ? { title: page.eyebrow, description: page.intro, alternates: { canonical: `/${slug}` } } : {}; }
export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug as keyof typeof pages];
  if (!page) notFound();
  return <main id="main-content"><section className="page-hero section-mint"><div className="container"><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p><BookButton>Let’s talk about your business ↗</BookButton></div></section><section className="section"><div className="container content-grid">{page.items.map((item, index) => <article className="card content-card" id={"id" in item ? item.id : undefined} key={item.title}><span className="card-number">0{index + 1}</span><h2>{item.title}</h2><p>{item.text}</p></article>)}</div></section></main>;
}
