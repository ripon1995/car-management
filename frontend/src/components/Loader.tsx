import { HashLoader } from 'react-spinners'
import './Loader.css'

interface LoaderProps {
  label?: string
}

function Loader({ label = 'Loading' }: LoaderProps) {
  return (
    <div className="app-loader">
      <HashLoader size={80} color="#ea580c" aria-label={label} loading />
    </div>
  )
}

export default Loader
