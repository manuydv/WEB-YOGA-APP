import { useEffect } from "react";

// iOS reads the live DOM when "Add to Home Screen" is tapped, so updating
// these tags per-route is enough there. Android/Chrome's install prompt
// reads the manifest linked in <head> — there's only one manifest file on
// disk (generated at build time), so for Chrome we swap the <link
// rel="manifest"> to a Blob URL holding a per-route copy of it instead.
// start_url/scope point at the current path so re-opening a saved icon
// lands back on that studio's specific member/trainer page, not "/".

const BASE_MANIFEST = {
  description: "Member, payment, and financial tracking for studios and shops.",
  theme_color: "#F4EFE2",
  background_color: "#F4EFE2",
  display: "standalone" as const,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

/** Labels the home-screen icon "TaraShaktiYoga <label>" for the current route, so Owner/Member/Trainer installs are distinguishable. */
export function useHomeScreenIdentity(label: string) {
  useEffect(() => {
    const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const previousTitle = titleMeta?.getAttribute("content") ?? null;
    if (titleMeta) titleMeta.setAttribute("content", `TaraShaktiYoga ${label}`);

    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousHref = manifestLink?.getAttribute("href") ?? null;
    let blobUrl: string | null = null;

    if (manifestLink) {
      const manifest = {
        ...BASE_MANIFEST,
        name: `TaraShaktiYoga ${label}`,
        short_name: label,
        start_url: window.location.pathname,
        scope: window.location.pathname,
      };
      blobUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
      manifestLink.setAttribute("href", blobUrl);
    }

    return () => {
      if (titleMeta && previousTitle !== null) titleMeta.setAttribute("content", previousTitle);
      if (manifestLink && previousHref !== null) manifestLink.setAttribute("href", previousHref);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [label]);
}
