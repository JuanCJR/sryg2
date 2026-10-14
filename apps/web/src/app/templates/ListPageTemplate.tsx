import type { ReactNode } from 'react'
import { TemplateEmptyFrame, TemplateErrorFrame, TemplateLoadingFrame } from './TemplateFrames'
import type { TemplateEmptyContent, TemplateErrorContent } from './templateTypes'
import styles from './ListPageTemplate.module.css'

type ListCommon = {
  title: string // the template renders the <h1>
  breadcrumb?: ReactNode
  summary?: ReactNode // count or context line (e.g. an annunciator panel)
  primaryAction?: ReactNode // rendered only if the container's can() allows it
  toolbar?: ReactNode // search bar and filters
  banner?: ReactNode
  overlays?: ReactNode
}

export type ListPageTemplateProps = ListCommon &
  (
    | { status: 'loading'; loadingLabel: string }
    | { status: 'error'; error: TemplateErrorContent }
    | { status: 'empty'; empty: TemplateEmptyContent }
    | { status: 'ready'; children: ReactNode; pagination?: ReactNode }
  )

/**
 * Minimum contract for every list-style page (Listado de personal, and later Bloqueos,
 * Reportes, Auditoría, Usuarios). Direction is fixed at
 * `.impeccable/surfaces/src-features-personnel-pages-listadopage-tsx.md` ("Lookup console
 * with annunciator panel"); the template stays generic and content-agnostic — the annunciator
 * itself is content the container supplies through `summary`, never template logic.
 *
 * `title`, `breadcrumb`, `primaryAction`, and `toolbar` render in EVERY status, including
 * `error` and `loading` — so the page never reflows on resolve, an error keeps the query field
 * reachable (the container may pass a disabled toolbar), and a "no-results" state keeps the
 * filter editable. `summary` (the annunciator) renders in every status except `error`, since it
 * has nothing meaningful to summarize when the data failed to load; a `loading` summary is the
 * container's own placeholder content (e.g. unlit lamps), not template logic.
 */
export function ListPageTemplate(props: ListPageTemplateProps) {
  const { title, breadcrumb, summary, primaryAction, toolbar, banner, overlays, status } = props

  return (
    <div className={styles.page}>
      {banner}

      {breadcrumb ? <div className={styles.breadcrumbRow}>{breadcrumb}</div> : null}

      <div className={styles.headerRow}>
        <h1 className={styles.title}>{title}</h1>
        {primaryAction}
      </div>

      {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}

      {summary && status !== 'error' ? <div className={styles.summary}>{summary}</div> : null}

      {status === 'loading' ? <TemplateLoadingFrame label={props.loadingLabel} /> : null}
      {status === 'error' ? <TemplateErrorFrame error={props.error} /> : null}
      {status === 'empty' ? <TemplateEmptyFrame empty={props.empty} /> : null}
      {status === 'ready' ? (
        <>
          <div className={styles.results}>{props.children}</div>
          {props.pagination ? <div className={styles.pagination}>{props.pagination}</div> : null}
        </>
      ) : null}

      {overlays}
    </div>
  )
}
