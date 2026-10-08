import { useEffect } from "react";

export type Portal = "owner" | "member" | "trainer";

// iOS reads the live DOM (apple-mobile-web-app-title + apple-touch-icon)
// at the moment "Add to Home Screen" is tapped, so updating those tags
// per-route is enough there for the icon image and label.
//
// For the LAUNCH destination, point <link rel="manifest"> at a real,
// per-portal static file (manifest-<portal>.webmanifest, committed to
// public/) rather than a Blob URL built on the fly. A Blob URL only
// exists for the lifetime of the page that created it — it works at the
// moment you tap "Add to Home Screen", but a cold launch later (a fresh
// page load, which is what tapping the saved icon does) can't refetch it,
// so iOS/Chrome silently falls back to the default /manifest.webmanifest
// whose start_url is "/" — landing on the owner app regardless of which
// icon was tapped. The static files below deliberately omit start_url
// (and scope): per the Web App Manifest spec, when start_url is absent it
// defaults to the URL of the page that linked the manifest, which is
// already the right member/trainer studio link — no per-studio slug needs
// baking into the manifest itself.

const MANIFEST_FILE: Record<Portal, string> = {
  owner: "/manifest-owner.webmanifest",
  member: "/manifest-member.webmanifest",
  trainer: "/manifest-trainer.webmanifest",
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
    if (manifestLink) manifestLink.setAttribute("href", MANIFEST_FILE[portal]);

    return () => {
      if (titleMeta && previousTitle !== null) titleMeta.setAttribute("content", previousTitle);
      if (touchIconLink && previousTouchIcon !== null) touchIconLink.setAttribute("href", previousTouchIcon);
      if (manifestLink && previousManifestHref !== null) manifestLink.setAttribute("href", previousManifestHref);
    };
  }, [portal]);
}
