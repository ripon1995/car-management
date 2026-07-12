import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './ProfilePage.css'

function ProfilePage() {
  const user = useAuthStore((state) => state.user)

  return (
    <main id="content" className="profile-page">
      <div className="profile-page-header">
        <h1>Profile</h1>
        <Link to="/dashboard">Back to dashboard</Link>
      </div>

      {user && (
        <div className="profile-detail card">
          <dl className="profile-detail-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>
      )}
    </main>
  )
}

export default ProfilePage
