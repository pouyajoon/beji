export default function HomePage() {
  return (
    <main className="container py-8">
      <section className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">Beji</h1>
        <p className="text-base text-gray-600 sm:text-lg">
          Next.js + TypeScript + Tailwind starter. Mobile-first and responsive by default.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">Responsive card A</div>
          <div className="rounded-lg border p-4">Responsive card B</div>
          <div className="rounded-lg border p-4">Responsive card C</div>
        </div>
      </section>
    </main>
  );
}


