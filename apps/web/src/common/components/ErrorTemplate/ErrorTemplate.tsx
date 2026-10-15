import { useNavigate } from 'react-router'
import { Button } from '..'
import { HOME } from '../../../routes'
import styles from './ErrorTemplate.module.css'

export interface ErrorTemplateProps {
  code: '403' | '404'
  title: string
  explanation: string
}

/** Shown inside the shell for a forbidden route (403) or an unknown one (404). */
export function ErrorTemplate({ code, title, explanation }: ErrorTemplateProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.wrap} role="alert">
      <span className={styles.code}>{code}</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{explanation}</p>
      <Button variant="primary" onClick={() => navigate(HOME.path)}>
        {HOME.label}
      </Button>
    </div>
  )
}
