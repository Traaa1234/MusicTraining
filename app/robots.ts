import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal / auth-gated areas shouldn't be indexed.
      disallow: ["/api/", "/profile", "/train/review"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
