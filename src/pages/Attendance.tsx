import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { today } from "@/lib/dates";
import { Input } from "@/components/ui";
import { Field } from "@/components/Field";
import TopBar from "@/components/TopBar";
import { IconCheckCircle } from "@/components/icons";
import type { Class, Member } from "@/types/database";

function Avatar({ url }: { url: string | null }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
    </div>
  );
}

export default function Attendance() {
  const { staffUser } = useAuth();

  const [date, setDate] = useState(today());
  const [members, setMembers] = useState<Member[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    if (!staffUser) return;
    const [membersRes, classesRes] = await Promise.all([
      supabase.from("members").select("*").order("name", { ascending: true }),
      supabase.from("classes").select("*").order("start_time", { ascending: true }),
    ]);
    setMembers(membersRes.data ?? []);
    setClasses(classesRes.data ?? []);
  }, [staffUser]);

  const loadAttendance = useCallback(async () => {
    if (!staffUser) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase.from("visits").select("member_id").eq("visited_on", date);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPresentIds(new Set((data ?? []).map((v) => v.member_id)));
    }
    setLoading(false);
  }, [staffUser, date]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const roster = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((m) => {
      if (classFilter === "all") {
        // no-op, everyone passes
      } else if (classFilter === "none") {
        if (m.class_id) return false;
      } else if (m.class_id !== classFilter) {
        return false;
      }
      if (term && !m.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [members, classFilter, search]);

  const handleToggle = async (memberId: string) => {
    setTogglingId(memberId);
    setError(null);
    const isPresent = presentIds.has(memberId);
    if (isPresent) {
      const { error: deleteError } = await supabase
        .from("visits")
        .delete()
        .eq("member_id", memberId)
        .eq("visited_on", date);
      if (deleteError) {
        setError(deleteError.message);
      } else {
        setPresentIds((prev) => {
          const next = new Set(prev);
          next.delete(memberId);
          return next;
        });
      }
    } else {
      const { error: upsertError } = await supabase
        .from("visits")
        .upsert({ member_id: memberId, visited_on: date, notes: "Marked by owner" }, { onConflict: "member_id,visited_on" });
      if (upsertError) {
        setError(upsertError.message);
      } else {
        setPresentIds((prev) => new Set(prev).add(memberId));
      }
    }
    setTogglingId(null);
  };

  const presentCount = roster.filter((m) => presentIds.has(m.id)).length;

  return (
    <div>
      <TopBar title="Check-in" />
      <div className="p-4 pb-10">
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

        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members" className="mb-3" />

        <div className="mb-3 text-xs font-semibold text-text-muted">
          {presentCount} of {roster.length} marked present
        </div>

        {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}

        {!loading && roster.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-muted">No members match this filter.</p>
        ) : (
          roster.map((m) => {
            const present = presentIds.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                disabled={togglingId === m.id}
                onClick={() => handleToggle(m.id)}
                className={`mb-2.5 flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-60 ${
                  present ? "border-success/40 bg-success-bg" : "border-border bg-surface"
                }`}
              >
                <Avatar url={m.photo_url} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-text">{m.name}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{m.phone ?? "No phone on file"}</div>
                </div>
                {present ? (
                  <IconCheckCircle className="shrink-0 text-success" />
                ) : (
                  <div className="h-6 w-6 shrink-0 rounded-full border-2 border-border" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
