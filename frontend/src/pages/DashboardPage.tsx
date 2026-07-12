import PlaceholderPage from '../components/PlaceholderPage'
import { DashboardIcon } from '../components/NavIcons'

function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      icon={<DashboardIcon />}
      description="The revenue dashboard (income vs. expense, computed from payments) is coming soon."
    />
  )
}

export default DashboardPage
