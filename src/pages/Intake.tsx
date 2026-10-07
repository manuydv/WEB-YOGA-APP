import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { Field } from "@/components/Field";
import LoadingScreen from "@/components/LoadingScreen";
import Footer from "@/components/Footer";
import BrandHeader from "@/components/BrandHeader";
import type { BusinessType } from "@/types/database";

interface StudioInfo {
  name: string;
  business_type: BusinessType;
  contact_phone_1: string | null;
  contact_phone_2: string | null;
  contact_email: string | null;
  contact_address: string | null;
  website_url: string | null;
}

export default function Intake() {
  const { slug } = useParams<{ slug: string }>();
  const [studioInfo, setStudioInfo] = useState<StudioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .rpc("get_intake_studio", { intake_slug: slug ?? "" })
      .then(({ data, error: rpcError }) => {
        if (!mounted) return;
        if (rpcError || !data || data.length === 0) {
          setNotFound(true);
        } else {
          setStudioInfo(data[0]);
        }
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) return <LoadingScreen />;

  if (notFound || !studioInfo) {
    return (
      <div className="min-h-screen bg-ink">
        <BrandHeader />
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <h1 className="text-xl font-bold text-text">Link not active</h1>
          <p className="mt-2 text-sm text-text-muted">This sign-up link isn't available anymore. Ask the front desk.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-ink">
        <BrandHeader />
        <div className="flex flex-1 flex-col items-center px-6 py-10 text-center">
          <h1 className="text-xl font-bold text-text">You're all set!</h1>
          <p className="mt-2 text-sm text-text-muted">
            Thanks, {name.trim()}. {studioInfo.name} has your details.
          </p>
        </div>
        <Footer info={studioInfo} />
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc("public_intake_add_client", {
      intake_slug: slug ?? "",
      client_name: name.trim(),
      client_phone: phone.trim() || null,
      client_email: email.trim() || null,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <BrandHeader />
      <div className="flex flex-1 items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-text">Welcome to {studioInfo.name}</h1>
        <p className="mb-7 mt-2 text-center text-sm text-text-muted">
          Leave your details so we can remind you when it's time to come back.
        </p>

        <Field label="Your name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </Field>
        <Field label="Email (optional)">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </Field>

        {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}

        <Button type="submit" loading={submitting} disabled={!name.trim()} className="w-full">
          Submit
        </Button>
      </form>
      </div>
      <Footer info={studioInfo} />
    </div>
  );
}
