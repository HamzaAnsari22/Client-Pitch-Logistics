import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Send = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h13M12 5l7 7-7 7" />
  </Svg>
);
export const Mic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Svg>
);
export const Settings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Svg>
);
export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const Home = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />
  </Svg>
);
export const Truck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Svg>
);
export const Building = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 21V5l8-2v18M12 8l8 3v10M3 21h18M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2" />
  </Svg>
);
export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </Svg>
);
export const Info = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);
export const Pin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </Svg>
);
export const Copy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </Svg>
);
export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const Download = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Svg>
);
export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const Calendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
);
export const Phone = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
    <path d="M11 18.5h2" />
  </Svg>
);
export const Message = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3V6a1 1 0 0 1 1-1z" />
  </Svg>
);
export const Clipboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
  </Svg>
);
export const Arrow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const Warning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4l9 16H3zM12 10v4M12 17h.01" />
  </Svg>
);
export const Box = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7.5L12 4l8 3.5v9L12 20l-8-3.5zM4 7.5l8 3.5 8-3.5M12 11v9" />
  </Svg>
);
export const Snow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5" />
  </Svg>
);
export const Users = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17.5 14.5a5 5 0 0 1 3 4.5" />
  </Svg>
);
export const Bolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />
  </Svg>
);

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#14233B" />
      <path d="M7 19.5V12l9-4.5 9 4.5v7.5L16 24z" fill="none" stroke="#C24E0E" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M7 12l9 4.5 9-4.5M16 16.5V24" fill="none" stroke="#F5F3EE" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
