import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";
import { Container } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { whatsappHref } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer className="border-t border-line bg-white py-12 text-sm text-mute">
      <Container>
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <BrandLockup />
            <p className="mt-3 max-w-[30ch] text-sm text-text-2">
              Ordenamos atención, citas, seguimiento y reportes para PYMES
              dominicanas que quieren trabajar con más control.
            </p>
          </div>
          <div>
            <h5 className="mb-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-primary">
              Servicios
            </h5>
            <div className="flex flex-col gap-1">
              <Link href="/#soluciones" className="py-1 text-text-2 hover:text-amber-deep">
                Mensajes en orden
              </Link>
              <Link href="/#soluciones" className="py-1 text-text-2 hover:text-amber-deep">
                Seguimiento de clientes
              </Link>
              <Link href="/#soluciones" className="py-1 text-text-2 hover:text-amber-deep">
                Agenda inteligente
              </Link>
              <Link href="/#soluciones" className="py-1 text-text-2 hover:text-amber-deep">
                Tareas repetitivas
              </Link>
            </div>
          </div>
          <div>
            <h5 className="mb-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-primary">
              Sectores
            </h5>
            <div className="flex flex-col gap-1">
              <Link href="/clinicas" className="py-1 text-text-2 hover:text-amber-deep">
                Clínicas y odontólogos
              </Link>
              <Link href="/#sectores" className="py-1 text-text-2 hover:text-amber-deep">
                Academias
              </Link>
              <Link href="/#sectores" className="py-1 text-text-2 hover:text-amber-deep">
                Comercios
              </Link>
              <Link href="/#sectores" className="py-1 text-text-2 hover:text-amber-deep">
                Servicios profesionales
              </Link>
            </div>
          </div>
          <div>
            <h5 className="mb-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-primary">
              Contacto
            </h5>
            <div className="flex flex-col gap-1">
              <a
                href={whatsappHref("footer")}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 text-text-2 hover:text-amber-deep"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:${brand.email}`}
                className="py-1 text-text-2 hover:text-amber-deep"
              >
                {brand.email}
              </a>
              <span className="py-1 text-text-2">{brand.location}</span>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-[12.5px]">
          <div>
            © {new Date().getFullYear()} QuisqueyaTech · {brand.location}
          </div>
          <div className="flex gap-4">
            <Link href="/privacidad" className="hover:text-amber-deep">
              Privacidad
            </Link>
            <span>Consultoría operativa · v1.0</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
