import { BrowserRouter } from 'react-router'
import { ToastProvider } from './common/components'
import { AppRoutes } from './AppRoutes'
import { RoleProvider } from './common/components/RoleProvider/RoleProvider'

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
