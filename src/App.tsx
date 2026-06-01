import { useState } from 'react'
import Shell from './components/Shell'
import { WarungDataProvider } from './data/dataSource'
import { LocalStateProvider } from './data/localState'

export type Page = 'home' | 'projects' | 'operations' | 'wiki'

export default function App() {
  const [activePage, setActivePage] = useState<Page>('home')
  return (
    <LocalStateProvider>
      <WarungDataProvider>
        <Shell activePage={activePage} setActivePage={setActivePage} />
      </WarungDataProvider>
    </LocalStateProvider>
  )
}
