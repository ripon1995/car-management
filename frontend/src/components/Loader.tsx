import './Loader.css'

interface LoaderProps {
  label?: string
}

function Loader({ label = 'Loading' }: LoaderProps) {
  return (
    <div className="app-loader" role="status" aria-label={label}>
      <span className="app-loader-spinner" aria-hidden="true" />
      <span className="app-loader-label">{label}</span>
    </div>
  )
}

export default Loader
