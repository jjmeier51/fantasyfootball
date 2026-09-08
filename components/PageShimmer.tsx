"use client";

import { usePathname } from "next/navigation";

/**
 * A quick sheen that sweeps across the viewport once per navigation (and on a fresh load).
 * Keyed on the pathname so React remounts it, which restarts the CSS animation.
 */
export default function PageShimmer() {
  const pathname = usePathname();
  return <div key={pathname} className="page-shimmer" aria-hidden="true" />;
}
