import { useEffect } from "react";

export type Portal = "owner" | "member" | "trainer";

// iOS reads the live DOM (apple-mobile-web-app-title + apple-touch-icon)
// at the moment "Add to Home Screen" is tapped, so updating those tags
// per-route is enough there for the icon image and label.
//
// For the LAUNCH destination, the manifest's start_url has to be baked in
// per-visit (it needs this exact studio's /checkin/<slug> or
// /trainer/<slug> path, which isn't known until runtime) — a static file
// can't hold that. A Blob URL can hold it, but only lives as long as the
// page that created it: it works at "Add to Home Screen" time, but a cold
// launch later (tapping the saved icon, a fresh page load) can't refetch
// it, so iOS silently falls back to the default manifest's start_url "/"
// — landing on the owner app regardless of which icon was tapped.
// Omitting start_url from a static per-portal file (so it defaults to the
// referring page, per the Web App Manifest spec) turned out not to be
// reliable in practice either.
//
// A data: URI sidesteps both problems: the manifest's full JSON is
// embedded directly in the href string itself, so there's no fetch
// involved at all, no lifetime tied to the page, and start_url can still
// be the exact current path.

const BASE_MANIFEST = {
  description: "Member, payment, and financial tracking for studios and shops.",
  theme_color: "#F4EFE2",
  background_color: "#F4EFE2",
  display: "standalone" as const,
};

/** Gives the current route its own home-screen name, icon, and launch URL (Owner/Member/Trainer), each visually distinct. */
export function useHomeScreenIdentity(portal: Portal) {
  useEffect(() => {
    const label = portal.charAt(0).toUpperCase() + portal.slice(1);

    const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const previousTitle = titleMeta?.getAttribute("content") ?? null;
    if (titleMeta) titleMeta.setAttribute("content", `TaraShaktiYoga ${label}`);

    const touchIconLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const previousTouchIcon = touchIconLink?.getAttribute("href") ?? null;
    if (touchIconLink) touchIconLink.setAttribute("href", `/apple-touch-icon-${portal}.png`);

    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousManifestHref = manifestLink?.getAttribute("href") ?? null;

    if (manifestLink) {
      const path = window.location.pathname;
      const manifest = {
        ...BASE_MANIFEST,
        name: `TaraShaktiYoga ${label}`,
        short_name: label,
        start_url: path,
        scope: path,
        icons: [
          { src: `/icon-${portal}-192.png`, sizes: "192x192", type: "image/png" },
          { src: `/icon-${portal}-512.png`, sizes: "512x512", type: "image/png" },
          { src: `/icon-${portal}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };
      const dataUrl = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;
      manifestLink.setAttribute("href", dataUrl);
    }

    return () => {
      if (titleMeta && previousTitle !== null) titleMeta.setAttribute("content", previousTitle);
      if (touchIconLink && previousTouchIcon !== null) touchIconLink.setAttribute("href", previousTouchIcon);
      if (manifestLink && previousManifestHref !== null) manifestLink.setAttribute("href", previousManifestHref);
    };
  }, [portal]);
}
