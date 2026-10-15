import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/dates";
import { Badge, Card } from "@/components/ui";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import type { CheckinAction } from "@/types/database";

const LIMIT = 300;

const ACTION_LABELS: Record<CheckinAction, string> = {
  checkin: "Logged in",
  claim_pin: "Set up PIN",
  update_profile: "Updated profile",
  self_attendance: "Marked attendance",
  trainer_login: "Trainer logged in",
};

interface LogRow {
  id: number;
  phone_key: string;
  success: boolean;
  action: CheckinAction;
  attempted_at: string;
  members: { name: string } | null;
  employees: { name: string } | null;
}

export default function ActivityLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("checkin_attempts")
      .select("id, phone_key, success, action, attempted_at, members(name), employees(name)")
      .order("attempted_at", { ascending: false })
      .limit(LIMIT);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRows((data as unknown as LogRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <TopBar title="Activity log" back />
      <div className="p-4 pb-10">
        <p className="mb-4 text-sm text-text-muted">
          Logins and self-service changes from the member/trainer portal, most recent first. A failed attempt shows
          the phone number even when nobody could be identified. Showing the last {LIMIT}.
        </p>

        {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}

        {rows.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-muted">No activity yet.</p>
        ) : (
          rows.map((row) => {
            const name = row.members?.name ?? row.employees?.name ?? null;
            return (
              <Card key={row.id} className="mb-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-text">{ACTION_LABELS[row.action]}</div>
                    <div className="mt-0.5 text-xs text-text-muted">
                      {name ? `${name} · ` : ""}
                      {row.phone_key}
                    </div>
                    <div className="mt-0.5 text-xs text-text-muted">{formatDateTime(row.attempted_at)}</div>
                  </div>
                  <Badge tone={row.success ? "success" : "danger"}>{row.success ? "Success" : "Failed"}</Badge>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
