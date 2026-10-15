import { useEffect, useState } from "react";

/** Auto-rotating photo slideshow with tappable dot indicators. */
export function Slideshow({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), 4000);
    return () => clearInterval(id);
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-surface-raised">
        <img src={photos[index]} alt="" className="h-full w-full object-cover" />
      </div>
      {photos.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-accent" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
