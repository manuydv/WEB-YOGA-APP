import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { formatDays, formatTime } from "@/lib/dates";
import { IconPlus } from "@/components/icons";
import TopBar from "@/components/TopBar";
import type { Class } from "@/types/database";

export default function ClassesList() {
  const { staffUser } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!staffUser) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("classes")
      .select("*")
      .order("start_time", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setClasses(data ?? []);
    }
    setLoading(false);
  }, [staffUser]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative min-h-[calc(100vh-6rem)]">
      <TopBar title="Classes" back />
      <div className="p-4">
        {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}

        {!loading && classes.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-muted">
            No classes yet. Add your first one so clients can see it when they check in.
          </p>
        ) : (
          classes.map((item) => (
            <Link
              key={item.id}
              to={`/classes/${item.id}`}
              className="mb-2.5 flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="text-[15px] font-semibold text-text">{item.name}</div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {formatDays(item.days_of_week)} · {formatTime(item.start_time)} · {item.duration_minutes} min
                </div>
                {item.instructor_name ? (
                  <div className="mt-0.5 text-xs text-text-muted">{item.instructor_name}</div>
                ) : null}
              </div>
            </Link>
          ))
        )}
      </div>

      <Link
        to="/classes/new"
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg"
      >
        <IconPlus />
      </Link>
    </div>
  );
}
