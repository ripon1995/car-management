import { BallTriangle } from 'react-loader-spinner'
import './Loader.css'

interface LoaderProps {
  label?: string
}

function Loader({ label = 'Loading' }: LoaderProps) {
  return (
    <div className="app-loader">
      <BallTriangle height={80} width={80} radius={5} color="#ea580c" ariaLabel={label} visible />
    </div>
  )
}

export default Loader
