import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: site.production ? "/" : undefined,
      disallow: site.production ? ["/api/", "/calendar/setup"] : "/",
    },
    ...(site.production ? { sitemap: `${site.url}/sitemap.xml` } : {}),
  };
}
