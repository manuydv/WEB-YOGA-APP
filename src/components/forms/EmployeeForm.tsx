import type { ChangeEvent } from "react";
import { Field, Segmented } from "@/components/Field";
import { Input } from "@/components/ui";
import { isValidDate } from "@/lib/dates";
import type { EmployeeStatus } from "@/types/database";

export interface EmployeeFormValues {
  name: string;
  roleTitle: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  monthlyPay: string;
  status: EmployeeStatus;
  joinedOn: string;
}

export interface EmployeeFormErrors {
  name?: string;
  monthlyPay?: string;
  joinedOn?: string;
}

export function validateEmployeeForm(values: EmployeeFormValues): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};
  if (!values.name.trim()) errors.name = "Name is required.";
  if (!isValidDate(values.joinedOn)) errors.joinedOn = "Use the format YYYY-MM-DD.";
  const pay = Number(values.monthlyPay);
  if (values.monthlyPay.trim() === "" || Number.isNaN(pay) || pay < 0) {
    errors.monthlyPay = "Enter a monthly pay of 0 or more.";
  }
  return errors;
}

export default function EmployeeForm({
  values,
  errors,
  onChange,
  photoUrl,
  onPhotoUpload,
  photoUploading,
}: {
  values: EmployeeFormValues;
  errors: EmployeeFormErrors;
  onChange: <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => void;
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

      <Field label="Role / title">
        <Input
          value={values.roleTitle}
          onChange={(e) => onChange("roleTitle", e.target.value)}
          placeholder="e.g. Instructor, Barber, Cleaner"
        />
      </Field>

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
          placeholder="employee@example.com"
          type="email"
        />
      </Field>

      <Field label="Date of birth">
        <Input value={values.dateOfBirth} onChange={(e) => onChange("dateOfBirth", e.target.value)} type="date" />
      </Field>

      <Field label="Joined on" error={errors.joinedOn}>
        <Input value={values.joinedOn} onChange={(e) => onChange("joinedOn", e.target.value)} placeholder="YYYY-MM-DD" />
      </Field>

      <Field label="Monthly pay" error={errors.monthlyPay}>
        <Input
          value={values.monthlyPay}
          onChange={(e) => onChange("monthlyPay", e.target.value)}
          placeholder="e.g. 15000"
          inputMode="decimal"
        />
      </Field>

      <Segmented
        label="Status"
        value={values.status}
        onChange={(v) => onChange("status", v)}
        options={[
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
      />
    </div>
  );
}
