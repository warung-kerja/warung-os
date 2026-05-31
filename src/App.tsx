import { useState } from 'react'
import Shell from './components/Shell'

export type Page = 'home' | 'projects' | 'operations' | 'wiki'

export default function App() {
  const [activePage, setActivePage] = useState<Page>('home')
  return <Shell activePage={activePage} setActivePage={setActivePage} />
}
