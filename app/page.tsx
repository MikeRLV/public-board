import { Metadata } from 'next';
import { CalendarLogic } from '../components/CalendarLogic';

/* METADATA: This updates the browser tab title and description.
  It ensures your site is branded "B LoCAL" everywhere.
*/
export const metadata: Metadata = {
  title: "B LoCAL",
  description: "A unique collection of events visualized on your calendar.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const currentCity = typeof params.city === 'string' ? params.city : '';

  return (
    <main className="min-h-screen bg-black text-white">
      {/* The key ensures the calendar re-renders fully when switching cities.
        Current city context is passed directly to the logic component.
      */}
      <CalendarLogic city={currentCity} key={currentCity} />
    </main>
  );
}