import { CalendarLogic } from './components/CalendarLogic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const currentCity = typeof params.city === 'string' ? params.city : '';

  return (
    <main className="min-h-screen bg-black text-white">
      {/* The key ensures the calendar re-renders fully when switching cities */}
      <CalendarLogic city={currentCity} key={currentCity} />
    </main>
  );
}