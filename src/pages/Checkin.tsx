import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { computeCheckinStats } from "@/lib/checkin";
import { formatDays, formatTime, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getBusinessTypeConfig } from "@/lib/businessTypes";
import { Badge, Button, Card, Input, StatTile } from "@/components/ui";
import { Field } from "@/components/Field";
import { IconCalendarCheck, IconClock, IconFlame, IconPercent } from "@/components/icons";
import LoadingScreen from "@/components/LoadingScreen";
import type { BusinessType, MemberStatus } from "@/types/database";

interface ScheduleItem {
  name: string;
  instructor_name: string | null;
  days_of_week: number[];
  start_time: string;
  duration_minutes: number;
}

interface CheckinResult {
  member_name: string;
  recent_visits: string[];
  monthly_fee: number;
  member_status: MemberStatus;
  this_month_paid: boolean;
}

export default function Checkin() {
  const { slug } = useParams<{ slug: string }>();
  const [studioInfo, setStudioInfo] = useState<{ name: string; business_type: BusinessType } | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState<"checkin" | "claim">("checkin");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      supabase.rpc("get_checkin_studio", { intake_slug: slug ?? "" }),
      supabase.rpc("get_checkin_schedule", { intake_slug: slug ?? "" }),
    ]).then(([studioRes, scheduleRes]) => {
      if (!mounted) return;
      if (studioRes.error || !studioRes.data || studioRes.data.length === 0) {
        setNotFound(true);
      } else {
        setStudioInfo(studioRes.data[0]);
      }
      setSchedule(scheduleRes.data ?? []);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) return <LoadingScreen />;

  if (notFound || !studioInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
        <h1 className="text-xl font-bold text-text">Check-in not active</h1>
        <p className="mt-2 text-sm text-text-muted">This link isn't set up for check-in. Ask the front desk.</p>
      </div>
    );
  }

  const config = getBusinessTypeConfig(studioInfo.business_type);

  const ScheduleCard = schedule.length > 0 && (
    <Card className="mt-5">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Class schedule</div>
      <div className="flex flex-col gap-3">
        {schedule.map((item) => (
          <div key={item.name}>
            <div className="text-sm font-semibold text-text">{item.name}</div>
            <div className="text-xs text-text-muted">
              {formatDays(item.days_of_week)} · {formatTime(item.start_time)} · {item.duration_minutes} min
              {item.instructor_name ? ` · ${item.instructor_name}` : ""}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  if (result) {
    const stats = computeCheckinStats(result.recent_visits, today());
    return (
      <div className="flex min-h-screen flex-col items-center bg-ink px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-2xl font-bold text-text">Welcome back, {result.member_name.split(" ")[0]}!</h1>
          <p className="mb-6 mt-1 text-center text-sm text-text-muted">You're checked in at {studioInfo.name}.</p>

          {config.mode === "membership" ? (
            <Card className="mb-3" highlight>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold capitalize text-text">{result.member_status} member</div>
                  <div className="mt-0.5 text-xs text-text-muted">{formatMoney(result.monthly_fee)}/month</div>
                </div>
                <Badge tone={result.this_month_paid ? "success" : "danger"}>
                  {result.this_month_paid ? "Paid this month" : "Unpaid this month"}
                </Badge>
              </div>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={<IconFlame />} value={stats.weekStreak} label="Week streak" />
            <StatTile icon={<IconCalendarCheck />} value={stats.thisWeekVisits} label="This week" />
            <StatTile icon={<IconPercent />} value={`${stats.attendancePct}%`} label="Attendance" />
            <StatTile icon={<IconClock />} value={stats.totalVisits} label="Visits (10 wks)" />
          </div>

          {ScheduleCard}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) {
      setError("Enter your phone number and PIN.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc("public_check_in", {
      intake_slug: slug ?? "",
      client_phone: phone.trim(),
      pin: pin.trim(),
    });
    setSubmitting(false);
    if (rpcError || !data || data.length === 0) {
      setError(rpcError?.message ?? "Couldn't check you in.");
      return;
    }
    setResult(data[0]);
  };

  const handleClaim = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !newPin.trim()) {
      setError("Enter your phone number and a PIN.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc("public_claim_checkin_pin", {
      intake_slug: slug ?? "",
      client_phone: phone.trim(),
      new_pin: newPin.trim(),
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setPin(newPin);
    setNewPin("");
    setMode("checkin");
    setClaimMessage("PIN set! Tap Check in below to continue.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-10">
      <div className="w-full max-w-sm">
        {mode === "checkin" ? (
          <form onSubmit={handleSubmit}>
            <h1 className="text-center text-2xl font-bold text-text">Check in at {studioInfo.name}</h1>
            <p className="mb-7 mt-2 text-center text-sm text-text-muted">
              Enter your phone number and the PIN the front desk gave you.
            </p>

            <Field label="Phone number">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoFocus />
            </Field>
            <Field label="PIN">
              <Input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={6} />
            </Field>

            {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}
            {claimMessage ? <p className="mb-3 text-center text-sm text-success">{claimMessage}</p> : null}

            <Button type="submit" loading={submitting} disabled={!phone.trim() || !pin.trim()} className="w-full">
              Check in
            </Button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setClaimMessage(null);
                setMode("claim");
              }}
              className="mt-4 block w-full text-center text-sm text-accent"
            >
              First time? Set up your check-in PIN
            </button>
          </form>
        ) : (
          <form onSubmit={handleClaim}>
            <h1 className="text-center text-2xl font-bold text-text">Set your check-in PIN</h1>
            <p className="mb-7 mt-2 text-center text-sm text-text-muted">
              Enter the phone number {studioInfo.name} has on file for you, and pick a 4-6 digit PIN to check in
              with from now on.
            </p>

            <Field label="Phone number">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoFocus />
            </Field>
            <Field label="Choose a PIN">
              <Input value={newPin} onChange={(e) => setNewPin(e.target.value)} inputMode="numeric" maxLength={6} />
            </Field>

            {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}

            <Button type="submit" loading={submitting} disabled={!phone.trim() || !newPin.trim()} className="w-full">
              Set PIN
            </Button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("checkin");
              }}
              className="mt-4 block w-full text-center text-sm text-text-muted"
            >
              Already have a PIN? Check in instead
            </button>
          </form>
        )}

        {ScheduleCard}
      </div>
    </div>
  );
}
