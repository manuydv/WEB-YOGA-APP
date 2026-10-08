import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import EmployeeForm, { validateEmployeeForm } from "@/components/forms/EmployeeForm";
import type { EmployeeFormValues } from "@/components/forms/EmployeeForm";
import { Button, Card } from "@/components/ui";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import type { Employee } from "@/types/database";

function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    name: employee.name,
    roleTitle: employee.role_title ?? "",
    phone: employee.phone ?? "",
    email: employee.email ?? "",
    dateOfBirth: employee.date_of_birth ?? "",
    monthlyPay: String(employee.monthly_pay),
    status: employee.status,
    joinedOn: employee.joined_on,
  };
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [values, setValues] = useState<EmployeeFormValues | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validateEmployeeForm>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const { data, error: fetchError } = await supabase.from("employees").select("*").eq("id", id).single();
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setEmployee(data);
    setValues(toFormValues(data));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !values) return <LoadingScreen />;
  if (error || !employee) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <p className="text-sm text-danger">{error ?? "Employee not found."}</p>
      </div>
    );
  }

  const handleChange = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateEmployeeForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSavedMessage(null);
    const { error: updateError } = await supabase
      .from("employees")
      .update({
        name: values.name.trim(),
        role_title: values.roleTitle.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        date_of_birth: values.dateOfBirth || null,
        monthly_pay: Number(values.monthlyPay),
        status: values.status,
        joined_on: values.joinedOn,
      })
      .eq("id", employee.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
    setSavedMessage("Employee details updated.");
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${employee.name}? This can't be undone.`)) return;
    const { error: deleteError } = await supabase.from("employees").delete().eq("id", employee.id);
    if (deleteError) {
      window.alert(`Couldn't delete: ${deleteError.message}`);
      return;
    }
    navigate("/employees");
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${employee.id}/photo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("employee-photos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (uploadError) {
      setUploadingPhoto(false);
      window.alert(`Couldn't upload photo: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
    const photoUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("employees")
      .update({ photo_url: photoUrl })
      .eq("id", employee.id);
    setUploadingPhoto(false);
    if (updateError) {
      window.alert(`Couldn't save photo: ${updateError.message}`);
      return;
    }
    await load();
  };

  const handleSetPin = async () => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const pin = String(100000 + (buf[0] % 900000));
    setSavingPin(true);
    const { error: pinError } = await supabase.from("employees").update({ check_in_pin: pin }).eq("id", employee.id);
    setSavingPin(false);
    if (pinError) {
      window.alert(`Couldn't set PIN: ${pinError.message}`);
      return;
    }
    await load();
  };

  const handleRemovePin = async () => {
    setSavingPin(true);
    const { error: pinError } = await supabase
      .from("employees")
      .update({ check_in_pin: null })
      .eq("id", employee.id);
    setSavingPin(false);
    if (pinError) {
      window.alert(`Couldn't remove PIN: ${pinError.message}`);
      return;
    }
    await load();
  };

  return (
    <div>
      <TopBar title="Employee" back />
      <form onSubmit={handleSave} className="p-4 pb-10">
        <EmployeeForm
          values={values}
          errors={errors}
          onChange={handleChange}
          photoUrl={employee.photo_url}
          onPhotoUpload={handlePhotoUpload}
          photoUploading={uploadingPhoto}
        />
        {savedMessage ? <p className="mb-3 text-center text-sm text-success">{savedMessage}</p> : null}
        <Button type="submit" loading={saving} className="w-full">
          Save changes
        </Button>

        <Card className="mt-6">
          <div className="text-[15px] font-bold text-text">Trainer login PIN</div>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Lets {employee.name.split(" ")[0]} log in to the trainer portal with their phone number and this PIN,
            to see their own info and mark member attendance.
          </p>
          {employee.check_in_pin ? (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-2xl font-bold tracking-[0.3em] text-text">{employee.check_in_pin}</div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleSetPin} loading={savingPin}>
                  Change
                </Button>
                <Button type="button" variant="danger" onClick={handleRemovePin} loading={savingPin}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={handleSetPin} loading={savingPin} className="mt-3 w-full">
              Set a PIN
            </Button>
          )}
        </Card>

        <Button type="button" variant="danger" onClick={handleDelete} className="mt-3 w-full">
          Delete employee
        </Button>
      </form>
    </div>
  );
}
