function iconProps(width = 18, height = 18) {
  return { viewBox: '0 0 24 24', width, height, fill: 'none', 'aria-hidden': true } as const
}

export function DashboardIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function CarOwnersIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CarsIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M4 16.5V14l1.6-4.2A1.5 1.5 0 0 1 7 9h10a1.5 1.5 0 0 1 1.4.8L20 14v2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="3" y="14" width="18" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7.5" cy="18.5" r="1.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.5" cy="18.5" r="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function VendorsIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M4 9l1-4h14l1 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 9v10h14V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DriversIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function MaintenanceIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M14.5 6.5a3.5 3.5 0 0 0-4.6 4.2L4 16.6V20h3.4l5.9-5.9a3.5 3.5 0 0 0 4.2-4.6l-2.6 2.6-2-2 2.6-2.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CarDocsIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function PaymentsIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 9h.01M18.5 15h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ProfileIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 8l4 4-4 4M18 12H9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
