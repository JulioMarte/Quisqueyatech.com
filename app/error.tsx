"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-primary">Algo salió mal</h1>
      <p className="max-w-md text-text-2">
        No pudimos cargar esta página. Intenta de nuevo en unos segundos.
      </p>
      {error.digest ? <p className="text-xs text-mute">Ref: {error.digest}</p> : null}
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
