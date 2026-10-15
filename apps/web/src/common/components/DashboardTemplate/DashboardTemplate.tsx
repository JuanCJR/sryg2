import { useId, type ReactNode } from 'react'
import { Button } from '../Button/Button'
import { Notice } from '../Notice/Notice'
import styles from './DashboardTemplate.module.css'

/** A failed load of the main region: never a raw string, the retry is optional but structured. */
export interface DashboardErrorContent {
  title: string
  message: ReactNode
  onRetry?: () => void
  /** @default 'Reintentar' */
  retryLabel?: string
}

/** 'no-data': nothing exists yet. 'no-results': the current filters match nothing. */
export interface DashboardEmptyContent {
  reason: 'no-data' | 'no-results'
  title: string
  message: ReactNode
  action?: ReactNode
}

type DashboardCommon = {
  title: string // the template renders the <h1>
  breadcrumb?: ReactNode
  /** Header action (e.g. a link to reports), rendered only if the container's can() allows it. */
  primaryAction?: ReactNode
  banner?: ReactNode
  /** Quick controls above the main region. */
  toolbar?: ReactNode
  /** Left filter column of the main region (a FilterPanel), as in ListPageTemplate. */
  filters?: ReactNode
  /** Counts of the main region (e.g. an annunciator); hidden on `error`, it has nothing to summarize. */
  summary?: ReactNode
  /** Accessible name of the main region (the region the status describes). */
  mainLabel: string
  /** Secondary panels with their own data (e.g. the access log, D23); rendered in every status. */
  panels?: ReactNode
  overlays?: ReactNode
}

export type DashboardTemplateProps = DashboardCommon &
  (
    | { status: 'loading'; loadingLabel: string }
    | { status: 'error'; error: DashboardErrorContent }
    | { status: 'empty'; empty: DashboardEmptyContent }
    | { status: 'ready'; children: ReactNode; pagination?: ReactNode }
  )

/**
 * DS-04 landing template (page 2, /panel). There is no approved Impeccable direction for the
 * Dashboard yet (plan §5): this template adds no visual direction of its own. It reuses the
 * single-column composition of ListPageTemplate (title, toolbar, summary, results) and stacks the
 * secondary panels below, using only existing tokens. It stays content-agnostic: what the summary,
 * main region and panels show, and for which role, is the container's decision.
 *
 * `title`, `breadcrumb`, `primaryAction`, `toolbar` and `panels` render in every status, so the
 * page never reflows when the main region resolves and filters stay editable after an error.
 */
export function DashboardTemplate(props: DashboardTemplateProps) {
  const { title, breadcrumb, primaryAction, banner, toolbar, filters, summary, mainLabel, panels, overlays, status } =
    props
  const mainId = useId()

  return (
    <div className={styles.page}>
      {banner}

      {breadcrumb ? <div className={styles.breadcrumbRow}>{breadcrumb}</div> : null}

      <div className={styles.headerRow}>
        <h1 className={styles.title}>{title}</h1>
        {primaryAction}
      </div>

      <div className={filters ? styles.withFilters : undefined}>
        {filters ? <div className={styles.filters}>{filters}</div> : null}
        <section className={styles.main} aria-labelledby={mainId}>
          <h2 id={mainId} className="visually-hidden">
            {mainLabel}
          </h2>
          {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
          {summary && status !== 'error' ? <div className={styles.summary}>{summary}</div> : null}

          {status === 'loading' ? (
            <div className={styles.loading} aria-busy="true">
              <p role="status" className={styles.muted}>
                {props.loadingLabel}
              </p>
            </div>
          ) : null}
          {status === 'error' ? (
            <Notice
              tone="caution"
              title={props.error.title}
              action={
                props.error.onRetry ? (
                  <Button variant="secondary" onClick={props.error.onRetry}>
                    {props.error.retryLabel ?? 'Reintentar'}
                  </Button>
                ) : undefined
              }
            >
              {props.error.message}
            </Notice>
          ) : null}
          {status === 'empty' ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{props.empty.title}</p>
              <div className={styles.muted}>{props.empty.message}</div>
              {props.empty.action ? <div>{props.empty.action}</div> : null}
            </div>
          ) : null}
          {status === 'ready' ? (
            <>
              <div className={styles.results}>{props.children}</div>
              {props.pagination ? <div className={styles.pagination}>{props.pagination}</div> : null}
            </>
          ) : null}
        </section>
      </div>

      {panels ? <div className={styles.panels}>{panels}</div> : null}

      {overlays}
    </div>
  )
}

export interface DashboardPanelProps {
  title: string
  children: ReactNode
}

/** A titled secondary region of the dashboard (`<section>` named by its `<h2>`). */
export function DashboardPanel({ title, children }: DashboardPanelProps) {
  const headingId = useId()
  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.panelTitle}>
        {title}
      </h2>
      {children}
    </section>
  )
}
