import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button, Card, Input, SectionLabel } from "@/components/ui";
import { Field } from "@/components/Field";
import { IconClose } from "@/components/icons";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import type { GalleryPhoto } from "@/types/database";

export default function Community() {
  const { studio } = useAuth();
  if (!studio) return <LoadingScreen />;
  return <CommunityForm key={studio.id} />;
}

function CommunityForm() {
  const { studio, refreshStudio } = useAuth();

  const [announcement, setAnnouncement] = useState(studio!.announcement_text ?? "");
  const [spotlight1Title, setSpotlight1Title] = useState(studio!.spotlight_1_title ?? "Student of the Month");
  const [spotlight1Name, setSpotlight1Name] = useState(studio!.spotlight_1_name ?? "");
  const [spotlight1Photo, setSpotlight1Photo] = useState(studio!.spotlight_1_photo_url);
  const [spotlight2Title, setSpotlight2Title] = useState(studio!.spotlight_2_title ?? "Most Consistent");
  const [spotlight2Name, setSpotlight2Name] = useState(studio!.spotlight_2_name ?? "");
  const [spotlight2Photo, setSpotlight2Photo] = useState(studio!.spotlight_2_photo_url);
  const [uploadingSpotlight, setUploadingSpotlight] = useState<1 | 2 | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(true);

  const loadGallery = useCallback(async () => {
    const { data } = await supabase.from("gallery_photos").select("*").order("created_at", { ascending: false });
    setGallery(data ?? []);
    setLoadingGallery(false);
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase
      .from("studios")
      .update({
        announcement_text: announcement.trim() || null,
        spotlight_1_title: spotlight1Title.trim() || null,
        spotlight_1_name: spotlight1Name.trim() || null,
        spotlight_2_title: spotlight2Title.trim() || null,
        spotlight_2_name: spotlight2Name.trim() || null,
      })
      .eq("id", studio!.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshStudio();
    setSavedMessage("Community tab updated.");
  };

  const handleSpotlightPhotoUpload = async (slot: 1 | 2, file: File) => {
    setUploadingSpotlight(slot);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${studio!.id}/spotlight-${slot}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("studio-gallery")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (uploadError) {
      setUploadingSpotlight(null);
      setError(`Couldn't upload photo: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("studio-gallery").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const column = slot === 1 ? "spotlight_1_photo_url" : "spotlight_2_photo_url";
    const { error: updateError } = await supabase
      .from("studios")
      .update({ [column]: url })
      .eq("id", studio!.id);
    setUploadingSpotlight(null);
    if (updateError) {
      setError(`Couldn't save photo: ${updateError.message}`);
      return;
    }
    if (slot === 1) setSpotlight1Photo(url);
    else setSpotlight2Photo(url);
    await refreshStudio();
  };

  const handleGalleryUpload = async (file: File) => {
    setUploadingGallery(true);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${studio!.id}/gallery/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("studio-gallery")
      .upload(path, file, { cacheControl: "3600" });
    if (uploadError) {
      setUploadingGallery(false);
      setError(`Couldn't upload photo: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("studio-gallery").getPublicUrl(path);
    const { error: insertError } = await supabase
      .from("gallery_photos")
      .insert({ studio_id: studio!.id, photo_url: data.publicUrl });
    setUploadingGallery(false);
    if (insertError) {
      setError(`Couldn't save photo: ${insertError.message}`);
      return;
    }
    await loadGallery();
  };

  const handleDeleteGalleryPhoto = async (photo: GalleryPhoto) => {
    if (!window.confirm("Remove this photo from the slideshow?")) return;
    const { error: deleteError } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
    if (deleteError) {
      window.alert(`Couldn't delete: ${deleteError.message}`);
      return;
    }
    await loadGallery();
  };

  return (
    <div>
      <TopBar title="Community tab" back />
      <form onSubmit={handleSave} className="p-4">
        <p className="mb-4 text-xs leading-relaxed text-text-muted">
          Shown to members on the "Community" tab of their account page, alongside their regular dashboard.
        </p>

        <SectionLabel>Announcement</SectionLabel>
        <Card className="mb-4">
          <Field label="Pinned message (optional)">
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. Studio closed Oct 20 for Diwali. New 7am batch starting Nov 1!"
              rows={3}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </Field>
        </Card>

        <SectionLabel>Spotlights</SectionLabel>
        <Card className="mb-4">
          <p className="mb-4 text-xs leading-relaxed text-text-muted">
            Two featured call-outs at the top of the Community tab — you pick who's shown, nothing here is
            automatic.
          </p>

          <div className="mb-5">
            <Field label="Title">
              <Input value={spotlight1Title} onChange={(e) => setSpotlight1Title(e.target.value)} />
            </Field>
            <Field label="Name">
              <Input
                value={spotlight1Name}
                onChange={(e) => setSpotlight1Name(e.target.value)}
                placeholder="e.g. Priya Sharma"
              />
            </Field>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
                {spotlight1Photo ? (
                  <img src={spotlight1Photo} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <label className="text-sm font-semibold text-accent">
                {uploadingSpotlight === 1 ? "Uploading…" : spotlight1Photo ? "Change photo" : "Add photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingSpotlight !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleSpotlightPhotoUpload(1, file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <Field label="Title">
              <Input value={spotlight2Title} onChange={(e) => setSpotlight2Title(e.target.value)} />
            </Field>
            <Field label="Name">
              <Input
                value={spotlight2Name}
                onChange={(e) => setSpotlight2Name(e.target.value)}
                placeholder="e.g. Arjun Mehta"
              />
            </Field>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
                {spotlight2Photo ? (
                  <img src={spotlight2Photo} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <label className="text-sm font-semibold text-accent">
                {uploadingSpotlight === 2 ? "Uploading…" : spotlight2Photo ? "Change photo" : "Add photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingSpotlight !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleSpotlightPhotoUpload(2, file);
                  }}
                />
              </label>
            </div>
          </div>
        </Card>

        {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}
        {savedMessage ? <p className="mb-3 text-center text-sm text-success">{savedMessage}</p> : null}

        <Button type="submit" loading={saving} className="w-full">
          Save
        </Button>
      </form>

      <div className="px-4 pb-10">
        <SectionLabel>Photo slideshow</SectionLabel>
        <Card>
          <p className="mb-3 text-xs leading-relaxed text-text-muted">
            Rotates on the Community tab. Add a few recent photos — no Instagram connection needed.
          </p>
          <label className="mb-4 block text-center">
            <span className="inline-block rounded-xl border border-accent/50 px-4 py-2.5 text-sm font-semibold text-accent">
              {uploadingGallery ? "Uploading…" : "Add photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingGallery}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleGalleryUpload(file);
              }}
            />
          </label>
          {loadingGallery ? null : gallery.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={photo.photo_url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeleteGalleryPhoto(photo)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <IconClose width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
