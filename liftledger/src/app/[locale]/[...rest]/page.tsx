import { notFound } from 'next/navigation';

// Addresses that match no page (/en/a/b/c) get the translated 404 in ./not-found.tsx instead of Next's default one.
export default function CatchAll() {
  notFound();
}
