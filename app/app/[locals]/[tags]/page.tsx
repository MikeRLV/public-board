import { Metadata } from 'next';
import { CalendarLogic } from '@/components/CalendarLogic';

export async function generateMetadata({ params }: { params: Promise<{ locals: string; tags: string }> }): Promise<Metadata> {
  const { locals = '', tags = '' } = await params;
  const displayLocals = locals ? locals.split('&').map(l => l.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ') : 'B LoCAL';
  const displayTags = tags ? tags.split('&').join(', ') : '';
  return {
    title: displayTags ? `B LoCAL — ${displayLocals} / ${displayTags}` : `B LoCAL — ${displayLocals}`,
    description: `${displayTags ? displayTags + ' events in ' : 'Events in '}${displayLocals} on B LoCAL.`,
  };
}

export default async function LocalsTagsPage({ params }: { params: Promise<{ locals: string; tags: string }> }) {
  const { locals = '', tags = '' } = await params;
  return (
    <main className="min-h-screen bg-black text-white">
      <CalendarLogic
        city=""
        initialLocals={locals ? locals.split('&') : []}
        initialTags={tags ? tags.split('&') : []}
        key={`${locals}/${tags}`}
      />
    </main>
  );
}
