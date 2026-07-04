import { Metadata } from 'next';
import { CalendarLogic } from '@/components/CalendarLogic';

// Root-level deep link: /new-york, /las-vegas, /new-york&los-angeles …
// Populates the given LoCAL(s) on load. In-app selection never rewrites the URL
// (nothing calls router.push), so browsing from blocal.fun keeps the plain URL —
// only a direct visit to /<local> preloads that local.
export async function generateMetadata({ params }: { params: Promise<{ locals: string }> }): Promise<Metadata> {
  const { locals = '' } = await params;
  const display = locals
    ? locals.split('&').map(l => l.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')
    : 'B LoCAL';
  return {
    title: `B LoCAL — ${display}`,
    description: `Events in ${display} on B LoCAL.`,
  };
}

export default async function LocalsPage({ params }: { params: Promise<{ locals: string }> }) {
  const { locals = '' } = await params;
  return (
    <main className="min-h-screen bg-black text-white">
      <CalendarLogic city="" initialLocals={locals ? locals.split('&') : []} key={locals} />
    </main>
  );
}
