import { Field } from "@/components/Field";
import { Input } from "@/components/ui";

export interface ClassFormValues {
  name: string;
  instructorName: string;
  daysOfWeek: number[]; // 0 = Sunday .. 6 = Saturday
  startTime: string; // HH:MM
  durationMinutes: string;
}

export interface ClassFormErrors {
  name?: string;
  startTime?: string;
  daysOfWeek?: string;
  durationMinutes?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function validateClassForm(values: ClassFormValues): ClassFormErrors {
  const errors: ClassFormErrors = {};
  if (!values.name.trim()) errors.name = "Name is required.";
  if (!values.startTime) errors.startTime = "Pick a start time.";
  if (values.daysOfWeek.length === 0) errors.daysOfWeek = "Pick at least one day.";
  const duration = Number(values.durationMinutes);
  if (values.durationMinutes.trim() === "" || Number.isNaN(duration) || duration <= 0) {
    errors.durationMinutes = "Enter a duration in minutes.";
  }
  return errors;
}

export default function ClassForm({
  values,
  errors,
  onChange,
}: {
  values: ClassFormValues;
  errors: ClassFormErrors;
  onChange: <K extends keyof ClassFormValues>(key: K, value: ClassFormValues[K]) => void;
}) {
  const toggleDay = (day: number) => {
    const next = values.daysOfWeek.includes(day)
      ? values.daysOfWeek.filter((d) => d !== day)
      : [...values.daysOfWeek, day].sort();
    onChange("daysOfWeek", next);
  };

  return (
    <div>
      <Field label="Class name">
        <Input value={values.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Hatha Yoga" />
      </Field>

      <Field label="Instructor (optional)">
        <Input
          value={values.instructorName}
          onChange={(e) => onChange("instructorName", e.target.value)}
          placeholder="e.g. Aman Saini"
        />
      </Field>

      <Field label="Days" error={errors.daysOfWeek}>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, i) => {
            const selected = values.daysOfWeek.includes(i);
            return (
              <button
                type="button"
                key={label}
                onClick={() => toggleDay(i)}
                className={`rounded-xl border px-3.5 py-2 text-sm font-semibold ${
                  selected ? "border-accent bg-accent text-white" : "border-border bg-surface text-text"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Start time" error={errors.startTime}>
        <Input value={values.startTime} onChange={(e) => onChange("startTime", e.target.value)} type="time" />
      </Field>

      <Field label="Duration (minutes)" error={errors.durationMinutes}>
        <Input
          value={values.durationMinutes}
          onChange={(e) => onChange("durationMinutes", e.target.value)}
          placeholder="e.g. 60"
          inputMode="numeric"
        />
      </Field>
    </div>
  );
}
