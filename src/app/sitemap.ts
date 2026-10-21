import type { MetadataRoute } from "next";
import { pages } from "@/lib/content";
export default function sitemap(): MetadataRoute.Sitemap { const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"; return ["", ...Object.keys(pages), "contact"].map(path => ({ url: `${url}/${path}`, changeFrequency: "monthly", priority: path ? .7 : 1 })); }
