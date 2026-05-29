import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Import } from './pages/Import'
import { Export } from './pages/Export'
import { Tutorial } from './pages/Tutorial'
import { Topology } from './pages/Topology'
import { TenancyTopology } from './pages/TenancyTopology'
import { Settings } from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="tenancy" element={<TenancyTopology />} />
          <Route path="topology" element={<Topology />} />
          <Route path="tutorial" element={<Tutorial />} />
          <Route path="import" element={<Import />} />
          <Route path="export" element={<Export />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
