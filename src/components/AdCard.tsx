import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";

export type Ad = {
  id: string;
  title: string;
  description: string;
  price: number;
  whatsapp: string;
  images: string[];
  is_featured: boolean;
  city: { name: string } | null;
  category: { name: string } | null;
  created_at: string;
};

export function AdCard({ ad }: { ad: Ad }) {
  const img = ad.images?.[0];
  return (
    <Link
      to="/ad/$adId"
      params={{ adId: ad.id }}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      {ad.is_featured && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-warning px-2 py-1 text-xs font-bold text-warning-foreground shadow">
          <Star className="size-3 fill-current" /> مميز
        </div>
      )}
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        {img ? (
          <img src={img} alt={ad.title} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">لا توجد صورة</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-1 font-semibold">{ad.title}</h3>
        <div className="text-lg font-extrabold text-primary">
          {ad.price.toLocaleString("ar-MR")} <span className="text-xs font-medium text-muted-foreground">MRU</span>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {ad.city?.name ?? "—"}</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{ad.category?.name ?? "—"}</span>
        </div>
      </div>
    </Link>
  );
}
