import { useEffect } from "react";

export type Portal = "owner" | "member" | "trainer";

// iOS reads the live DOM (apple-mobile-web-app-title + apple-touch-icon)
// at the moment "Add to Home Screen" is tapped, so updating those tags
// per-route is enough there. Android/Chrome's install prompt reads the
// manifest linked in <head> instead — there's only one manifest file on
// disk (generated at build time), so for Chrome we swap <link
// rel="manifest"> to a Blob URL holding a per-route copy of it, with its
// own name/short_name/icons. start_url/scope point at the current path so
// re-opening a saved icon lands back on that studio's specific
// member/trainer page, not "/".

const BASE_MANIFEST = {
  description: "Member, payment, and financial tracking for studios and shops.",
  theme_color: "#F4EFE2",
  background_color: "#F4EFE2",
  display: "standalone" as const,
};

/** Gives the current route its own home-screen name + icon (Owner/Member/Trainer), each visually distinct. */
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
    let blobUrl: string | null = null;

    if (manifestLink) {
      const manifest = {
        ...BASE_MANIFEST,
        name: `TaraShaktiYoga ${label}`,
        short_name: label,
        start_url: window.location.pathname,
        scope: window.location.pathname,
        icons: [
          { src: `/icon-${portal}-192.png`, sizes: "192x192", type: "image/png" },
          { src: `/icon-${portal}-512.png`, sizes: "512x512", type: "image/png" },
          { src: `/icon-${portal}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };
      blobUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
      manifestLink.setAttribute("href", blobUrl);
    }

    return () => {
      if (titleMeta && previousTitle !== null) titleMeta.setAttribute("content", previousTitle);
      if (touchIconLink && previousTouchIcon !== null) touchIconLink.setAttribute("href", previousTouchIcon);
      if (manifestLink && previousManifestHref !== null) manifestLink.setAttribute("href", previousManifestHref);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [portal]);
}
