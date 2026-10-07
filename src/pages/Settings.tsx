import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button, Card, Input, SectionLabel } from "@/components/ui";
import { Field } from "@/components/Field";
import BusinessTypePicker from "@/components/BusinessTypePicker";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import { getBusinessTypeConfig } from "@/lib/businessTypes";
import type { BusinessType } from "@/types/database";

function randomSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function Settings() {
  const { studio } = useAuth();
  if (!studio) return <LoadingScreen />;
  return <SettingsForm key={studio.id} />;
}

function SettingsForm() {
  const { studio, refreshStudio } = useAuth();

  const [businessType, setBusinessType] = useState<BusinessType>(studio!.business_type);
  const [reminderDays, setReminderDays] = useState(String(studio!.reminder_days));
  const [reminderMessage, setReminderMessage] = useState(studio!.reminder_message ?? "");
  const [intakeEnabled, setIntakeEnabled] = useState(studio!.public_intake_enabled);
  const [intakeSlug, setIntakeSlug] = useState(studio!.public_intake_slug);
  const [checkinEnabled, setCheckinEnabled] = useState(studio!.public_checkin_enabled);
  const [contactPhone1, setContactPhone1] = useState(studio!.contact_phone_1 ?? "");
  const [contactPhone2, setContactPhone2] = useState(studio!.contact_phone_2 ?? "");
  const [contactEmail, setContactEmail] = useState(studio!.contact_email ?? "");
  const [contactAddress, setContactAddress] = useState(studio!.contact_address ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(studio!.website_url ?? "");
  const [upiId, setUpiId] = useState(studio!.upi_id ?? "");
  const [paymentQrUrl, setPaymentQrUrl] = useState(studio!.payment_qr_url);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleIntake = () => {
    const next = !intakeEnabled;
    setIntakeEnabled(next);
    if (next && !intakeSlug) setIntakeSlug(randomSlug());
  };

  const handleToggleCheckin = () => {
    const next = !checkinEnabled;
    setCheckinEnabled(next);
    if (next && !intakeSlug) setIntakeSlug(randomSlug());
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const days = Number(reminderDays);
    if (!Number.isFinite(days) || days <= 0) {
      setError("Reminder days must be a positive number.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase
      .from("studios")
      .update({
        business_type: businessType,
        reminder_days: days,
        reminder_message: reminderMessage.trim() || null,
        public_intake_enabled: intakeEnabled,
        public_checkin_enabled: checkinEnabled,
        public_intake_slug: intakeEnabled || checkinEnabled ? intakeSlug : studio!.public_intake_slug,
        contact_phone_1: contactPhone1.trim() || null,
        contact_phone_2: contactPhone2.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_address: contactAddress.trim() || null,
        website_url: websiteUrl.trim() || null,
        upi_id: upiId.trim() || null,
      })
      .eq("id", studio!.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshStudio();
    setSavedMessage("Shop settings updated.");
  };

  const handleQrUpload = async (file: File) => {
    setUploadingQr(true);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${studio!.id}/qr.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-qr")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (uploadError) {
      setUploadingQr(false);
      setError(`Couldn't upload QR code: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("payment-qr").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase.from("studios").update({ payment_qr_url: url }).eq("id", studio!.id);
    setUploadingQr(false);
    if (updateError) {
      setError(`Couldn't save QR code: ${updateError.message}`);
      return;
    }
    setPaymentQrUrl(url);
    await refreshStudio();
  };

  const intakeConfig = getBusinessTypeConfig(businessType);
  const intakeLink = intakeSlug ? `${window.location.origin}/intake/${intakeSlug}` : null;
  const checkinLink = intakeSlug ? `${window.location.origin}/checkin/${intakeSlug}` : null;

  return (
    <div>
      <TopBar title="Settings" />
      <form onSubmit={handleSave} className="p-4 pb-10">
        <BusinessTypePicker value={businessType} onChange={setBusinessType} />

        <SectionLabel>Footer contact info</SectionLabel>
        <Card className="mb-4">
          <p className="mb-3 text-xs leading-relaxed text-text-muted">
            Shown at the bottom of your public check-in and sign-up pages. Leave anything blank to hide it.
          </p>
          <Field label="Phone number 1">
            <Input value={contactPhone1} onChange={(e) => setContactPhone1(e.target.value)} type="tel" />
          </Field>
          <Field label="Phone number 2 (optional)">
            <Input value={contactPhone2} onChange={(e) => setContactPhone2(e.target.value)} type="tel" />
          </Field>
          <Field label="Email">
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
          </Field>
          <Field label="Address">
            <textarea
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="Website">
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              type="url"
              placeholder="https://yourstudio.com"
            />
          </Field>
        </Card>

        <SectionLabel>Payment options</SectionLabel>
        <Card className="mb-4">
          <p className="mb-3 text-xs leading-relaxed text-text-muted">
            Shown to a member under "My info" on the check-in page as "Make payment". Leave blank to hide it.
          </p>
          <Field label="UPI ID">
            <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourstudio@upi" />
          </Field>
          <Field label="Payment QR code">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised">
                {paymentQrUrl ? (
                  <img src={paymentQrUrl} alt="" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <label className="text-sm font-semibold text-accent">
                {uploadingQr ? "Uploading…" : paymentQrUrl ? "Change QR code" : "Add QR code"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingQr}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleQrUpload(file);
                  }}
                />
              </label>
            </div>
          </Field>
        </Card>

        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold text-text">Self check-in link</div>
            <button
              type="button"
              onClick={handleToggleCheckin}
              className={`h-7 w-12 rounded-full transition ${checkinEnabled ? "bg-accent" : "bg-surface-raised"}`}
            >
              <span
                className={`block h-5 w-5 translate-y-1 rounded-full bg-white transition ${
                  checkinEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            Let a {intakeConfig.personLabelSingular.toLowerCase()} check themselves in with their phone number and
            a PIN (set one from their profile), and see their own streak and attendance — no app install, no
            account.
          </p>
          {checkinEnabled && checkinLink ? (
            <>
              <p className="mt-3 text-xs font-semibold text-text-muted">Share this link:</p>
              <a href={checkinLink} className="mt-1 block break-all text-sm text-accent">
                {checkinLink}
              </a>
            </>
          ) : null}
        </Card>

        {intakeConfig.mode === "visit" ? (
          <>
            <Field label="Remind after (days since last visit)">
              <Input value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Reminder message (optional)">
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="e.g. Time for a fresh cut! Show this text for 10% off."
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </Field>

            <Card className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-semibold text-text">Self-serve sign-up link</div>
                <button
                  type="button"
                  onClick={handleToggleIntake}
                  className={`h-7 w-12 rounded-full transition ${intakeEnabled ? "bg-accent" : "bg-surface-raised"}`}
                >
                  <span
                    className={`block h-5 w-5 translate-y-1 rounded-full bg-white transition ${
                      intakeEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Let a walk-in {intakeConfig.personLabelSingular.toLowerCase()} fill in their own name and phone
                number on their own phone, without a staff member typing it in.
              </p>
              {intakeEnabled && intakeLink ? (
                <>
                  <p className="mt-3 text-xs font-semibold text-text-muted">Share this link:</p>
                  <a href={intakeLink} className="mt-1 block break-all text-sm text-accent">
                    {intakeLink}
                  </a>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    Works on any phone's browser — no app install needed. Paste it into a QR code generator to
                    make a scannable poster for the front desk.
                  </p>
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}
        {savedMessage ? <p className="mb-3 text-center text-sm text-success">{savedMessage}</p> : null}

        <Button type="submit" loading={saving} className="w-full">
          Save settings
        </Button>
      </form>
    </div>
  );
}
