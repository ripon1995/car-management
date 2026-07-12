import { NavLink } from 'react-router-dom'
import {
  CarDocsIcon,
  CarOwnersIcon,
  CarsIcon,
  DashboardIcon,
  DriversIcon,
  MaintenanceIcon,
  PaymentsIcon,
  VendorsIcon,
} from './NavIcons'
import './NavMenu.css'

const links = [
  { to: '/dashboard', label: 'Dashboard', end: true, Icon: DashboardIcon },
  { to: '/car-owners', label: 'Car Owners', Icon: CarOwnersIcon },
  { to: '/cars', label: 'Cars', Icon: CarsIcon },
  { to: '/vendors', label: 'Vendors', Icon: VendorsIcon },
  { to: '/drivers', label: 'Drivers', Icon: DriversIcon },
  { to: '/maintenance', label: 'Maintenance', Icon: MaintenanceIcon },
  { to: '/car-docs', label: 'Car Docs', Icon: CarDocsIcon },
  { to: '/payments', label: 'Payments', Icon: PaymentsIcon },
]

function NavMenu() {
  return (
    <nav className="app-nav">
      <ul>
        {links.map(({ to, label, end, Icon }) => (
          <li key={to}>
            <NavLink to={to} end={end}>
              <span className="app-nav-icon">
                <Icon />
              </span>
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default NavMenu
