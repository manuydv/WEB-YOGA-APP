import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { computeCheckinStats } from "@/lib/checkin";
import { formatDays, formatTime, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getBusinessTypeConfig } from "@/lib/businessTypes";
import { Badge, Button, Card, DayPills, Input, StatTile } from "@/components/ui";
import { Field } from "@/components/Field";
import { IconCalendarCheck, IconClock, IconFlame, IconPercent } from "@/components/icons";
import LoadingScreen from "@/components/LoadingScreen";
import Footer from "@/components/Footer";
import type { BusinessType, MemberStatus } from "@/types/database";

interface ScheduleItem {
  name: string;
  instructor_name: string | null;
  days_of_week: number[];
  start_time: string;
  duration_minutes: number;
}

interface StudioInfo {
  name: string;
  business_type: BusinessType;
  contact_phone_1: string | null;
  contact_phone_2: string | null;
  contact_email: string | null;
  contact_address: string | null;
  website_url: string | null;
}

interface CheckinResult {
  member_id: string;
  member_name: string;
  recent_visits: string[];
  monthly_fee: number;
  member_status: MemberStatus;
  this_month_paid: boolean;
  photo_url: string | null;
  batch_name: string | null;
  batch_instructor_name: string | null;
  batch_days_of_week: number[] | null;
  batch_start_time: string | null;
  batch_duration_minutes: number | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
}

export default function Checkin() {
  const { slug } = useParams<{ slug: string }>();
  const [studioInfo, setStudioInfo] = useState<StudioInfo | null>(null);
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

  const [editOpen, setEditOpen] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editUploadingPhoto, setEditUploadingPhoto] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);

  const handleEditPhotoUpload = async (file: File) => {
    if (!result) return;
    setEditUploadingPhoto(true);
    setEditError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${result.member_id}/photo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("member-photos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (uploadError) {
      setEditUploadingPhoto(false);
      setEditError(`Couldn't upload photo: ${uploadError.message}`);
      return;
    }
    const { data: urlData } = supabase.storage.from("member-photos").getPublicUrl(path);
    const photoUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    const { data, error: rpcError } = await supabase.rpc("public_update_profile", {
      intake_slug: slug ?? "",
      client_phone: result.phone ?? "",
      pin,
      new_phone: editPhone.trim(),
      new_email: editEmail.trim() || null,
      new_date_of_birth: editDob || null,
      new_photo_url: photoUrl,
    });
    setEditUploadingPhoto(false);
    if (rpcError || !data || data.length === 0) {
      setEditError(rpcError?.message ?? "Couldn't save photo.");
      return;
    }
    setResult({ ...result, photo_url: data[0].photo_url });
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!result) return;
    if (!editPhone.trim()) {
      setEditError("Phone number cannot be blank.");
      return;
    }
    setEditError(null);
    setEditMessage(null);
    setEditSaving(true);
    const { data, error: rpcError } = await supabase.rpc("public_update_profile", {
      intake_slug: slug ?? "",
      client_phone: result.phone ?? "",
      pin,
      new_phone: editPhone.trim(),
      new_email: editEmail.trim() || null,
      new_date_of_birth: editDob || null,
    });
    setEditSaving(false);
    if (rpcError || !data || data.length === 0) {
      setEditError(rpcError?.message ?? "Couldn't save your info.");
      return;
    }
    const updated = data[0];
    setResult({ ...result, phone: updated.phone, email: updated.email, date_of_birth: updated.date_of_birth });
    setEditMessage("Saved!");
  };

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
          <Card className="mb-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Membership</div>
              <Badge tone="accent">Member</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
                {result.photo_url ? (
                  <img src={result.photo_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <div className="font-heading text-lg text-text">{result.member_name}</div>
                <div className="text-xs text-text-muted">{studioInfo.name}</div>
              </div>
            </div>
          </Card>

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

          {result.batch_name && result.batch_days_of_week && result.batch_start_time ? (
            <Card className="mt-5">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">My batch</div>
              <div className="text-[15px] font-semibold text-text">{result.batch_name}</div>
              <div className="mt-1 text-xs text-text-muted">
                {formatTime(result.batch_start_time)} · {result.batch_duration_minutes} min
                {result.batch_instructor_name ? ` · ${result.batch_instructor_name}` : ""}
              </div>
              <div className="mt-3">
                <DayPills days={result.batch_days_of_week} />
              </div>
            </Card>
          ) : null}

          <Card className="mt-5">
            <button
              type="button"
              onClick={() => setEditOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-text-muted">My info</div>
              <div className="text-xs font-semibold text-accent">{editOpen ? "Close" : "Edit"}</div>
            </button>

            {editOpen ? (
              <form onSubmit={handleProfileSave} className="mt-4">
                <div className="mb-4 flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
                    {result.photo_url ? (
                      <img src={result.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <label className="text-sm font-semibold text-accent">
                    {editUploadingPhoto ? "Uploading…" : result.photo_url ? "Change photo" : "Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={editUploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) handleEditPhotoUpload(file);
                      }}
                    />
                  </label>
                </div>

                <Field label="Phone number">
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel" />
                </Field>
                <Field label="Email">
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
                </Field>
                <Field label="Date of birth">
                  <Input value={editDob} onChange={(e) => setEditDob(e.target.value)} type="date" />
                </Field>

                {editError ? <p className="mb-3 text-center text-sm text-danger">{editError}</p> : null}
                {editMessage ? <p className="mb-3 text-center text-sm text-success">{editMessage}</p> : null}

                <Button type="submit" loading={editSaving} disabled={!editPhone.trim()} className="w-full">
                  Save
                </Button>
              </form>
            ) : null}
          </Card>

          <Footer info={studioInfo} />
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
    const checkinResult = data[0];
    setResult(checkinResult);
    setEditPhone(checkinResult.phone ?? "");
    setEditEmail(checkinResult.email ?? "");
    setEditDob(checkinResult.date_of_birth ?? "");
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

        <Footer info={studioInfo} />
      </div>
    </div>
  );
}
