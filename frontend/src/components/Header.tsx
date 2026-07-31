import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { useAuthStore } from '../store/authStore'
import { LogoutIcon, ProfileIcon } from './NavIcons'
import ThemeToggle from './ThemeToggle'
import './Header.css'

function Header() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()

  return (
    <header className="app-header">
      <img src={logo} className="app-logo" alt="Car Management" />
      <div className="app-header-account">
        <ThemeToggle />
        {user && (
          <>
            <Link to="/profile" className="app-header-profile" aria-label="Profile" title={user.email}>
              <ProfileIcon />
            </Link>
            <button type="button" className="app-header-logout" aria-label="Log out" title="Log out" onClick={logout}>
              <LogoutIcon />
            </button>
          </>
        )}
        {!user && location.pathname !== '/login' && (
          <Link to="/login" className="app-header-login">
            Log in
          </Link>
        )}
      </div>
    </header>
  )
}

export default Header
