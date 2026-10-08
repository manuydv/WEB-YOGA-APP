import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { today } from "@/lib/dates";
import { Badge, Card, Button, Input } from "@/components/ui";
import { Field } from "@/components/Field";
import { IconCheckCircle } from "@/components/icons";
import LoadingScreen from "@/components/LoadingScreen";
import Footer from "@/components/Footer";
import BrandHeader from "@/components/BrandHeader";
import { useHomeScreenIdentity } from "@/lib/homeScreen";
import type { Class } from "@/types/database";

interface StudioInfo {
  name: string;
  contact_phone_1: string | null;
  contact_phone_2: string | null;
  contact_email: string | null;
  contact_address: string | null;
  website_url: string | null;
}

interface TrainerProfile {
  employee_id: string;
  name: string;
  photo_url: string | null;
  role_title: string | null;
}

interface RosterRow {
  member_id: string;
  name: string;
  member_phone: string | null;
  photo_url: string | null;
  present: boolean;
}

function Avatar({ url }: { url: string | null }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
    </div>
  );
}

export default function Trainer() {
  useHomeScreenIdentity("Trainer");
  const { slug } = useParams<{ slug: string }>();
  const [studioInfo, setStudioInfo] = useState<StudioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<TrainerProfile | null>(null);

  const [tab, setTab] = useState<"profile" | "checkin">("profile");

  const [date, setDate] = useState(today());
  const [classes, setClasses] = useState<Class[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.rpc("get_checkin_studio", { intake_slug: slug ?? "" }).then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setStudioInfo(data[0]);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [slug]);

  const loadClasses = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.rpc("public_trainer_classes", {
      intake_slug: slug ?? "",
      phone,
      pin,
    });
    setClasses(data ?? []);
  }, [profile, slug, phone, pin]);

  const loadRoster = useCallback(async () => {
    if (!profile) return;
    setRosterLoading(true);
    setRosterError(null);
    const { data, error } = await supabase.rpc("public_trainer_roster", {
      intake_slug: slug ?? "",
      phone,
      pin,
      class_filter: classFilter,
      for_date: date,
    });
    if (error) {
      setRosterError(error.message);
    } else {
      setRoster(data ?? []);
    }
    setRosterLoading(false);
  }, [profile, slug, phone, pin, classFilter, date]);

  useEffect(() => {
    if (tab === "checkin") loadClasses();
  }, [tab, loadClasses]);

  useEffect(() => {
    if (tab === "checkin") loadRoster();
  }, [tab, loadRoster]);

  const filteredRoster = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roster;
    return roster.filter((m) => m.name.toLowerCase().includes(term));
  }, [roster, search]);

  const handleToggle = async (memberId: string, present: boolean) => {
    setTogglingId(memberId);
    setRosterError(null);
    const { error } = await supabase.rpc("public_trainer_toggle_attendance", {
      intake_slug: slug ?? "",
      phone,
      pin,
      target_member_id: memberId,
      for_date: date,
      present: !present,
    });
    if (error) {
      setRosterError(error.message);
    } else {
      setRoster((prev) => prev.map((m) => (m.member_id === memberId ? { ...m, present: !present } : m)));
    }
    setTogglingId(null);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) {
      setLoginError("Enter your phone number and PIN.");
      return;
    }
    setLoginError(null);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("public_trainer_login", {
      intake_slug: slug ?? "",
      phone: phone.trim(),
      pin: pin.trim(),
    });
    setSubmitting(false);
    if (error || !data || data.length === 0) {
      setLoginError(error?.message ?? "Couldn't log you in.");
      return;
    }
    setProfile(data[0]);
  };

  if (loading) return <LoadingScreen />;

  if (notFound || !studioInfo) {
    return (
      <div className="min-h-screen bg-ink">
        <BrandHeader />
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <h1 className="text-xl font-bold text-text">Trainer portal not active</h1>
          <p className="mt-2 text-sm text-text-muted">This link isn't set up. Ask the studio owner.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-ink">
        <BrandHeader />
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <form onSubmit={handleLogin}>
              <h1 className="text-center text-2xl font-bold text-text">Trainer login at {studioInfo.name}</h1>
              <p className="mb-7 mt-2 text-center text-sm text-text-muted">
                Enter your phone number and the PIN the studio owner gave you.
              </p>

              <Field label="Phone number">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoFocus />
              </Field>
              <Field label="PIN">
                <Input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={6} />
              </Field>

              {loginError ? <p className="mb-3 text-center text-sm text-danger">{loginError}</p> : null}

              <Button type="submit" loading={submitting} disabled={!phone.trim() || !pin.trim()} className="w-full">
                Log in
              </Button>
            </form>
          </div>
        </div>
        <Footer info={studioInfo} />
      </div>
    );
  }

  const presentCount = filteredRoster.filter((m) => m.present).length;

  return (
    <div className="min-h-screen bg-ink">
      <BrandHeader />
      <div className="flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-5 flex rounded-2xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setTab("profile")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                tab === "profile" ? "bg-accent text-white" : "text-text-muted"
              }`}
            >
              My profile
            </button>
            <button
              type="button"
              onClick={() => setTab("checkin")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                tab === "checkin" ? "bg-accent text-white" : "text-text-muted"
              }`}
            >
              Check-in
            </button>
          </div>

          {tab === "profile" ? (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Trainer</div>
                <Badge tone="accent">Instructor</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <div className="font-heading text-lg text-text">{profile.name}</div>
                  <div className="text-xs text-text-muted">
                    {profile.role_title ? `${profile.role_title} · ` : ""}
                    {studioInfo.name}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div>
              <Field label="Date">
                <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" max={today()} />
              </Field>

              <div className="mb-4">
                <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-text-muted">Batch</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setClassFilter("all")}
                    className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
                      classFilter === "all" ? "bg-accent text-white" : "border border-border bg-surface text-text"
                    }`}
                  >
                    All
                  </button>
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClassFilter(c.id)}
                      className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
                        classFilter === c.id ? "bg-accent text-white" : "border border-border bg-surface text-text"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setClassFilter("none")}
                    className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
                      classFilter === "none" ? "bg-accent text-white" : "border border-border bg-surface text-text"
                    }`}
                  >
                    No batch
                  </button>
                </div>
              </div>

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members"
                className="mb-3"
              />

              <div className="mb-3 text-xs font-semibold text-text-muted">
                {presentCount} of {filteredRoster.length} marked present
              </div>

              {rosterError ? <p className="mb-3 text-center text-sm text-danger">{rosterError}</p> : null}

              {!rosterLoading && filteredRoster.length === 0 ? (
                <p className="mt-10 text-center text-sm text-text-muted">No members match this filter.</p>
              ) : (
                filteredRoster.map((m) => (
                  <button
                    key={m.member_id}
                    type="button"
                    disabled={togglingId === m.member_id}
                    onClick={() => handleToggle(m.member_id, m.present)}
                    className={`mb-2.5 flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-60 ${
                      m.present ? "border-success/40 bg-success-bg" : "border-border bg-surface"
                    }`}
                  >
                    <Avatar url={m.photo_url} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-text">{m.name}</div>
                      <div className="mt-0.5 text-xs text-text-muted">{m.member_phone ?? "No phone on file"}</div>
                    </div>
                    {m.present ? (
                      <IconCheckCircle className="shrink-0 text-success" />
                    ) : (
                      <div className="h-6 w-6 shrink-0 rounded-full border-2 border-border" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <Footer info={studioInfo} />
    </div>
  );
}
