import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import ClassForm, { validateClassForm } from "@/components/forms/ClassForm";
import type { ClassFormValues } from "@/components/forms/ClassForm";
import { Button } from "@/components/ui";
import TopBar from "@/components/TopBar";

const initialValues: ClassFormValues = {
  name: "",
  instructorName: "",
  daysOfWeek: [],
  startTime: "",
  durationMinutes: "60",
};

export default function ClassNew() {
  const navigate = useNavigate();
  const { staffUser } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ReturnType<typeof validateClassForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = <K extends keyof ClassFormValues>(key: K, value: ClassFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateClassForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    if (!staffUser) return;

    setSubmitError(null);
    setSaving(true);
    const { error } = await supabase.from("classes").insert({
      studio_id: staffUser.studio_id,
      name: values.name.trim(),
      instructor_name: values.instructorName.trim() || null,
      days_of_week: values.daysOfWeek,
      start_time: `${values.startTime}:00`,
      duration_minutes: Number(values.durationMinutes),
    });
    setSaving(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }
    navigate("/classes");
  };

  return (
    <div>
      <TopBar title="Add class" back />
      <form onSubmit={handleSave} className="p-4 pb-10">
        <ClassForm values={values} errors={errors} onChange={handleChange} />
        {submitError ? <p className="mb-3 text-center text-sm text-danger">{submitError}</p> : null}
        <Button type="submit" loading={saving} className="w-full">
          Add class
        </Button>
      </form>
    </div>
  );
}
