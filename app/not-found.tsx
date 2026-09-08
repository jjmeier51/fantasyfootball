import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <div className="eyebrow">Incomplete pass</div>
      <h1 className="font-display text-6xl gold-text mt-2">404</h1>
      <p className="text-text-2 mt-3">That page is not in the record books.</p>
      <Link href="/" className="inline-block mt-6 rounded-full bg-gold text-bg font-semibold px-5 py-2">Back home</Link>
    </div>
  );
}
