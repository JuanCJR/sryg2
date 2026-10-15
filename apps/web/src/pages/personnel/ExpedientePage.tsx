import { ExpedienteContainer, type ExpedienteContainerProps } from './components/ExpedienteContainer'

/** Thin route entry — the app passes the tabs and actions each feature contributes. */
export function ExpedientePage(props: ExpedienteContainerProps) {
  return <ExpedienteContainer {...props} />
}
