import type { ReactNode } from 'react'

interface PlaceholderPageProps {
  title: string
  icon: ReactNode
  description: string
}

function PlaceholderPage({ title, icon, description }: PlaceholderPageProps) {
  return (
    <main id="content">
      <h1 className="page-title">
        <span className="app-nav-icon">{icon}</span>
        {title}
      </h1>
      <p>{description}</p>
    </main>
  )
}

export default PlaceholderPage
