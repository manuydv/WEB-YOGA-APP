import type { ChangeEvent } from "react";
import { Field, Segmented } from "@/components/Field";
import { Input } from "@/components/ui";
import { formatDays, formatTime, isValidDate } from "@/lib/dates";
import type { TrackingMode } from "@/lib/businessTypes";
import type { Class, Gender, MemberStatus } from "@/types/database";

export interface MemberFormValues {
  name: string;
  gender: Gender | "";
  phone: string;
  email: string;
  dateOfBirth: string;
  joinedOn: string;
  monthlyFee: string;
  status: MemberStatus;
  classId: string;
}

export interface MemberFormErrors {
  name?: string;
  joinedOn?: string;
  monthlyFee?: string;
}

export function validateMemberForm(values: MemberFormValues, mode: TrackingMode): MemberFormErrors {
  const errors: MemberFormErrors = {};
  if (!values.name.trim()) errors.name = "Name is required.";
  if (!isValidDate(values.joinedOn)) errors.joinedOn = "Use the format YYYY-MM-DD.";
  if (mode === "membership") {
    const fee = Number(values.monthlyFee);
    if (values.monthlyFee.trim() === "" || Number.isNaN(fee) || fee < 0) {
      errors.monthlyFee = "Enter a monthly fee of 0 or more.";
    }
  }
  return errors;
}

export default function MemberForm({
  values,
  errors,
  mode,
  onChange,
  classes = [],
  photoUrl,
  onPhotoUpload,
  photoUploading,
}: {
  values: MemberFormValues;
  errors: MemberFormErrors;
  mode: TrackingMode;
  onChange: <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => void;
  classes?: Class[];
  photoUrl?: string | null;
  onPhotoUpload?: (file: File) => void;
  photoUploading?: boolean;
}) {
  const handlePhotoInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file && onPhotoUpload) onPhotoUpload(file);
  };

  return (
    <div>
      {onPhotoUpload ? (
        <div className="mb-5 flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">No photo</div>
            )}
          </div>
          <label className="text-sm font-semibold text-accent">
            {photoUploading ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoInput} disabled={photoUploading} />
          </label>
        </div>
      ) : null}

      <Field label="Name" error={errors.name}>
        <Input value={values.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Full name" />
      </Field>

      <Segmented
        label="Gender"
        value={values.gender}
        onChange={(v) => onChange("gender", v)}
        options={[
          { label: "Female", value: "female" },
          { label: "Male", value: "male" },
          { label: "Other", value: "other" },
        ]}
      />

      <Field label="Phone">
        <Input
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="+91 98765 43210"
          type="tel"
        />
      </Field>

      <Field label="Email">
        <Input
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="member@example.com"
          type="email"
        />
      </Field>

      <Field label="Date of birth">
        <Input value={values.dateOfBirth} onChange={(e) => onChange("dateOfBirth", e.target.value)} type="date" />
      </Field>

      <Field label="Joined on" error={errors.joinedOn}>
        <Input value={values.joinedOn} onChange={(e) => onChange("joinedOn", e.target.value)} placeholder="YYYY-MM-DD" />
      </Field>

      {mode === "membership" ? (
        <>
          <Field label="Monthly fee" error={errors.monthlyFee}>
            <Input
              value={values.monthlyFee}
              onChange={(e) => onChange("monthlyFee", e.target.value)}
              placeholder="e.g. 2000"
              inputMode="decimal"
            />
          </Field>

          <Segmented
            label="Status"
            value={values.status}
            onChange={(v) => onChange("status", v)}
            options={[
              { label: "Active", value: "active" },
              { label: "Paused", value: "paused" },
              { label: "Inactive", value: "inactive" },
            ]}
          />

          {classes.length > 0 ? (
            <Field label="Batch">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onChange("classId", "")}
                  className={`rounded-xl border p-3 text-left ${
                    values.classId === "" ? "border-accent bg-accent-dim" : "border-border bg-surface"
                  }`}
                >
                  <div className={`text-[15px] font-semibold ${values.classId === "" ? "text-accent" : "text-text"}`}>
                    No batch
                  </div>
                </button>
                {classes.map((c) => {
                  const selected = values.classId === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => onChange("classId", c.id)}
                      className={`rounded-xl border p-3 text-left ${
                        selected ? "border-accent bg-accent-dim" : "border-border bg-surface"
                      }`}
                    >
                      <div className={`text-[15px] font-semibold ${selected ? "text-accent" : "text-text"}`}>
                        {c.name}
                      </div>
                      <div className={`mt-0.5 text-xs ${selected ? "text-accent/80" : "text-text-muted"}`}>
                        {formatDays(c.days_of_week)} · {formatTime(c.start_time)}
                        {c.instructor_name ? ` · ${c.instructor_name}` : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
