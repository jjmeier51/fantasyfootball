/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";

interface Props {
  owner: { key: string; name: string; color?: string | null; logo?: string | null };
  logo?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}

/** Team logo when we have one, otherwise a monogram badge in the owner's accent color. */
export default function OwnerAvatar({ owner, logo, size = 40, className, ring }: Props) {
  const src = logo ?? owner.logo;
  const initials = owner.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const style = { width: size, height: size } as const;
  if (src) {
    return (
      <img
        src={src}
        alt={`${owner.name} team logo`}
        width={size}
        height={size}
        loading="lazy"
        className={clsx("rounded-full object-cover bg-surface-2 shrink-0", ring && "ring-2 ring-gold/70", className)}
        style={style}
      />
    );
  }
  return (
    <span
      aria-label={owner.name}
      className={clsx("rounded-full inline-flex items-center justify-center font-display text-white shrink-0 select-none", ring && "ring-2 ring-gold/70", className)}
      style={{ ...style, background: owner.color ?? "#374151", fontSize: size * 0.45 }}
    >
      {initials}
    </span>
  );
}
