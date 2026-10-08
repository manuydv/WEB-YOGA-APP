import { useState } from "react";
import { Link } from "react-router-dom";
import writeXlsxFile from "write-excel-file/browser";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getBusinessTypeConfig } from "@/lib/businessTypes";
import { Card, SectionLabel } from "@/components/ui";
import { IconChevronRight, IconDownload, IconLogout } from "@/components/icons";
import TopBar from "@/components/TopBar";

export default function More() {
  const { studio, signOut } = useAuth();
  const config = getBusinessTypeConfig(studio?.business_type ?? "yoga_studio");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    const { data: members, error } = await supabase
      .from("members")
      .select("name, phone, email, date_of_birth, joined_on")
      .order("name", { ascending: true });
    setDownloading(false);

    if (error) {
      setDownloadError(error.message);
      return;
    }

    const rows = [
      [
        { value: "Name", fontWeight: "bold" as const },
        { value: "Phone", fontWeight: "bold" as const },
        { value: "Email", fontWeight: "bold" as const },
        { value: "Date of birth", fontWeight: "bold" as const },
        { value: "Date joined", fontWeight: "bold" as const },
      ],
      ...(members ?? []).map((m) => [
        { value: m.name },
        { value: m.phone ?? "" },
        { value: m.email ?? "" },
        { value: m.date_of_birth ?? "" },
        { value: m.joined_on },
      ]),
    ];

    await writeXlsxFile(rows).toFile(`${config.personLabelPlural.toLowerCase()}-${studio?.name ?? "studio"}.xlsx`);
  };

  return (
    <div>
      <TopBar title="More" />
      <div className="p-4">
        <Card className="mb-6">
          <div className="text-lg font-bold text-text">{studio?.name}</div>
          <div className="mt-0.5 text-sm text-text-muted">{config.label}</div>
        </Card>

        <SectionLabel>Manage</SectionLabel>
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <Link to="/employees" className="flex items-center justify-between border-b border-border px-4 py-4">
            <div>
              <div className="text-[15px] font-semibold text-text">Employees</div>
              <div className="mt-0.5 text-xs text-text-muted">Staff list, monthly pay &amp; trainer login</div>
            </div>
            <IconChevronRight className="text-text-muted" />
          </Link>
          <Link to="/classes" className="flex items-center justify-between border-b border-border px-4 py-4">
            <div>
              <div className="text-[15px] font-semibold text-text">Classes</div>
              <div className="mt-0.5 text-xs text-text-muted">Schedule shown to clients on check-in</div>
            </div>
            <IconChevronRight className="text-text-muted" />
          </Link>
          <Link to="/settings" className="flex items-center justify-between px-4 py-4">
            <div>
              <div className="text-[15px] font-semibold text-text">Settings</div>
              <div className="mt-0.5 text-xs text-text-muted">Shop type, reminders, sign-up link</div>
            </div>
            <IconChevronRight className="text-text-muted" />
          </Link>
        </div>

        <SectionLabel>Data</SectionLabel>
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex w-full items-center justify-between px-4 py-4 text-left disabled:opacity-60"
          >
            <div>
              <div className="text-[15px] font-semibold text-text">
                {downloading ? "Preparing…" : "Download data"}
              </div>
              <div className="mt-0.5 text-xs text-text-muted">
                {config.personLabelPlural} as an Excel file — name, phone, email, DOB, date joined
              </div>
            </div>
            <IconDownload className="shrink-0 text-text-muted" />
          </button>
        </div>
        {downloadError ? <p className="mb-6 -mt-4 text-center text-sm text-danger">{downloadError}</p> : null}

        <button
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/40 py-3.5 text-[15px] font-semibold text-danger"
        >
          <IconLogout width={18} height={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}
