import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-primary">Página no encontrada</h1>
      <p className="max-w-md text-text-2">La ruta que buscas no existe o fue movida.</p>
      <Link
        href="/"
        className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold leading-[2.75rem] text-white"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
