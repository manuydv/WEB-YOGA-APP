import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import ClassForm, { validateClassForm } from "@/components/forms/ClassForm";
import type { ClassFormValues } from "@/components/forms/ClassForm";
import { Button } from "@/components/ui";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import type { Class } from "@/types/database";

function toFormValues(cls: Class): ClassFormValues {
  return {
    name: cls.name,
    instructorName: cls.instructor_name ?? "",
    daysOfWeek: cls.days_of_week,
    startTime: cls.start_time.slice(0, 5),
    durationMinutes: String(cls.duration_minutes),
  };
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cls, setCls] = useState<Class | null>(null);
  const [values, setValues] = useState<ClassFormValues | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validateClassForm>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const { data, error: fetchError } = await supabase.from("classes").select("*").eq("id", id).single();
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setCls(data);
    setValues(toFormValues(data));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !values) return <LoadingScreen />;
  if (error || !cls) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <p className="text-sm text-danger">{error ?? "Class not found."}</p>
      </div>
    );
  }

  const handleChange = <K extends keyof ClassFormValues>(key: K, value: ClassFormValues[K]) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateClassForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSavedMessage(null);
    const { error: updateError } = await supabase
      .from("classes")
      .update({
        name: values.name.trim(),
        instructor_name: values.instructorName.trim() || null,
        days_of_week: values.daysOfWeek,
        start_time: `${values.startTime}:00`,
        duration_minutes: Number(values.durationMinutes),
      })
      .eq("id", cls.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
    setSavedMessage("Class updated.");
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${cls.name}? This can't be undone.`)) return;
    const { error: deleteError } = await supabase.from("classes").delete().eq("id", cls.id);
    if (deleteError) {
      window.alert(`Couldn't delete: ${deleteError.message}`);
      return;
    }
    navigate("/classes");
  };

  return (
    <div>
      <TopBar title="Class" back />
      <form onSubmit={handleSave} className="p-4 pb-10">
        <ClassForm values={values} errors={errors} onChange={handleChange} />
        {savedMessage ? <p className="mb-3 text-center text-sm text-success">{savedMessage}</p> : null}
        <Button type="submit" loading={saving} className="w-full">
          Save changes
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete} className="mt-3 w-full">
          Delete class
        </Button>
      </form>
    </div>
  );
}
