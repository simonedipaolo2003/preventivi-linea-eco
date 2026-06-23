import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'anagrafica', index: '01', label: 'Anagrafica' },
  { id: 'materiali', index: '02', label: 'Materiali' },
  { id: 'supporti', index: '03', label: 'Supporti' },
  { id: 'legno', index: '04', label: 'Legno' },
  { id: 'lavorazioni', index: '05', label: 'Ciottoli e mattoni' },
  { id: 'manodopera', index: '06', label: 'Manodopera' },
  { id: 'riepilogo', index: '07', label: 'Riepilogo' },
];

export function SectionNav() {
  const [active, setActive] = useState('anagrafica');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="flex flex-col gap-0.5">
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            <span
              className={`tnum text-2xs transition-colors ${isActive ? 'text-accent' : 'text-ink-faint'}`}
            >
              {s.index}
            </span>
            <span className="relative">
              {s.label}
              <span
                className={`absolute -left-3 top-1/2 h-3.5 w-px -translate-y-1/2 bg-accent transition-opacity duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </span>
          </a>
        );
      })}
    </nav>
  );
}
