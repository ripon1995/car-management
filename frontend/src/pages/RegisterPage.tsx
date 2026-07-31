import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ApiError } from '../errors/api'
import ErrorDialog from '../components/ErrorDialog'
import Loader from '../components/Loader'
import './AuthForm.css'

function RegisterPage() {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const register = useAuthStore((state) => state.register)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setEmailTaken(false)
    setIsSubmitting(true)
    try {
      await register({ email, password })
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEmailTaken(true)
      } else {
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, 'Something went wrong', 'Something went wrong'),
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main id="content">
      <h1>Register</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {emailTaken && (
          <p className="error">
            An account with this email already exists. <Link to="/login">Log in instead</Link>.
          </p>
        )}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registering…' : 'Register'}
        </button>
        <p className="hint">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        {isSubmitting && (
          <div className="auth-form-overlay">
            <Loader label="Registering…" />
          </div>
        )}
      </form>
      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default RegisterPage
