import { BrowserRouter } from 'react-router'
import { ToastProvider } from '../design-system'
import { AppRoutes } from './AppRoutes'
import { RoleProvider } from './role/RoleProvider'

function App() {
  return (
    <RoleProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </RoleProvider>
  )
}

export default App
