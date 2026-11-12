import type { ReactNode } from "react";

interface Props {
  size?: number;
  filled?: boolean;
}

function Svg({ size = 18, children, fill = "none" }: { size?: number; children: ReactNode; fill?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconoBuscar = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const IconoMas = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconoMenos = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconoEstrella = ({ filled, ...p }: Props) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </Svg>
);
export const IconoUbicacion = (p: Props) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);
export const IconoEditar = (p: Props) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);
export const IconoBasura = (p: Props) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
  </Svg>
);
export const IconoCerrar = (p: Props) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const IconoAlerta = (p: Props) => (
  <Svg {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
  </Svg>
);
export const IconoCheck = (p: Props) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
export const IconoDescarga = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </Svg>
);
export const IconoCaja = (p: Props) => (
  <Svg {...p}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />
  </Svg>
);

/** Logo: un chip con sus patitas. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill="#1fa870" />
      <rect x="18" y="18" width="28" height="28" rx="6" fill="#ffe0ec" />
      <rect x="25" y="25" width="14" height="14" rx="3" fill="#f0568f" />
      <g stroke="#ffe0ec" strokeWidth="3" strokeLinecap="round">
        <path d="M26 10v6M32 10v6M38 10v6M26 48v6M32 48v6M38 48v6M10 26h6M10 32h6M10 38h6M48 26h6M48 32h6M48 38h6" />
      </g>
    </svg>
  );
}
