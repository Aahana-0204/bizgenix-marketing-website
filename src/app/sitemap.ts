import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return site.production
    ? [{ url: site.url, changeFrequency: "monthly", priority: 1 }]
    : [];
}
