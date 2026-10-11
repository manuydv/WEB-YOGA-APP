import { IconInstagram, IconMapPin, IconSearch } from "@/components/icons";

export interface FooterInfo {
  name: string;
  contact_phone_1: string | null;
  contact_phone_2: string | null;
  contact_email: string | null;
  contact_address: string | null;
  website_url: string | null;
  instagram_url?: string | null;
  google_url?: string | null;
  map_url?: string | null;
}

export default function Footer({ info }: { info: FooterInfo }) {
  const hasSocialLinks = info.instagram_url || info.google_url || info.map_url;
  const hasContent =
    hasSocialLinks ||
    info.contact_phone_1 ||
    info.contact_phone_2 ||
    info.contact_email ||
    info.contact_address ||
    info.website_url;
  if (!hasContent) return null;

  return (
    <footer className="mt-10 w-full bg-[#7A3626] px-6 py-6 text-center text-[#F4EFE2]">
      <div className="font-heading text-lg uppercase tracking-wide">{info.name}</div>

      {hasSocialLinks ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          {info.instagram_url ? (
            <a
              href={info.instagram_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F4EFE2]/40 text-[#F4EFE2] transition hover:bg-[#F4EFE2]/10"
            >
              <IconInstagram width={19} height={19} />
            </a>
          ) : null}
          {info.google_url ? (
            <a
              href={info.google_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Find us on Google"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F4EFE2]/40 text-[#F4EFE2] transition hover:bg-[#F4EFE2]/10"
            >
              <IconSearch width={19} height={19} />
            </a>
          ) : null}
          {info.map_url ? (
            <a
              href={info.map_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Map location"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F4EFE2]/40 text-[#F4EFE2] transition hover:bg-[#F4EFE2]/10"
            >
              <IconMapPin width={19} height={19} />
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-1 text-sm text-[#F4EFE2]/90">
        {info.contact_phone_1 ? (
          <a href={`tel:${info.contact_phone_1}`} className="hover:underline">
            {info.contact_phone_1}
          </a>
        ) : null}
        {info.contact_phone_2 ? (
          <a href={`tel:${info.contact_phone_2}`} className="hover:underline">
            {info.contact_phone_2}
          </a>
        ) : null}
        {info.contact_email ? (
          <a href={`mailto:${info.contact_email}`} className="hover:underline">
            {info.contact_email}
          </a>
        ) : null}
      </div>
      {info.contact_address ? (
        <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-[#F4EFE2]/80">{info.contact_address}</p>
      ) : null}
      {info.website_url ? (
        <a
          href={info.website_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-semibold underline underline-offset-2"
        >
          {info.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      ) : null}
    </footer>
  );
}
