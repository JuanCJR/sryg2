import { useEffect, useRef, type ReactNode } from 'react'
import { PageKeys, Skeleton, getPageKeyDomIds, type PageKeyItem } from '..'
import { TemplateErrorFrame } from '../TemplateFrames/TemplateFrames'
import type { TemplateErrorContent } from '../../types/templateTypes'
import styles from './DetailPageTemplate.module.css'

export interface DetailTabs {
  idPrefix: string
  ariaLabel: string
  items: PageKeyItem[]
  activeId: string
  onChange: (id: string) => void
}

export type DetailPageTemplateProps =
  | {
      status: 'loading'
      /** Sticky banner shown while loading (the Expediente passes <WarningStack loading />). */
      banner?: ReactNode
      loadingLabel: string // visually hidden role="status" text
      headerSkeleton: ReactNode // feature-shaped skeleton
      tabCount: number // number of tab-key skeleton blocks
    }
  | { status: 'error'; error: TemplateErrorContent }
  | {
      status: 'ready'
      breadcrumb?: ReactNode
      /** Persistent banner, sticky under the top strip on every tab (blocked state lives here). */
      banner?: ReactNode
      announcement?: string // rendered in an aria-live="polite" region
      header: ReactNode // owns the page's single <h1>
      tabs: DetailTabs // the template renders PageKeys and wires role="tabpanel"
      children: ReactNode // the active panel
      overlays?: ReactNode // dialogs
    }

/**
 * Extracted from `ExpedienteContainer` (S01). Owns the sticky banner row, live region,
 * PageKeys ↔ panel ARIA wiring, and the loading/error frames. Does not render an `<h1>` —
 * the `header` slot owns it.
 */
export function DetailPageTemplate(props: DetailPageTemplateProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)

  // Sets --measured-stack-height on the root so the sibling page-keys row (phone layout) can read it — only once the page is ready, as before.
  useEffect(() => {
    if (props.status !== 'ready') {
      return
    }
    const stackEl = stackRef.current
    const rootEl = pageRef.current
    if (!stackEl || !rootEl) {
      return
    }
    const updateHeight = () => rootEl.style.setProperty('--measured-stack-height', `${stackEl.offsetHeight}px`)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(stackEl)
    return () => observer.disconnect()
  }, [props.status])

  if (props.status === 'loading') {
    const { banner, loadingLabel, headerSkeleton, tabCount } = props
    return (
      <div className={styles.page} ref={pageRef} aria-busy="true">
        {banner ? <div className={styles.stackSticky}>{banner}</div> : null}
        <p role="status" className="visually-hidden">
          {loadingLabel}
        </p>
        {headerSkeleton}
        <div className={styles.loadingKeys}>
          {Array.from({ length: tabCount }, (_, index) => (
            <Skeleton key={index} className={styles.skeletonKey} />
          ))}
        </div>
      </div>
    )
  }

  if (props.status === 'error') {
    return (
      <div className={styles.page} ref={pageRef}>
        <TemplateErrorFrame error={props.error} />
      </div>
    )
  }

  const { breadcrumb, banner, announcement, header, tabs, children, overlays } = props
  const { panelId, tabId } = getPageKeyDomIds(tabs.idPrefix, tabs.activeId)

  return (
    <div className={styles.page} ref={pageRef}>
      <div className={styles.breadcrumbRow}>{breadcrumb}</div>

      <div className={styles.stackSticky} ref={stackRef}>
        {banner}
      </div>

      <span aria-live="polite" className={styles.liveRegion}>
        {announcement ?? ''}
      </span>

      {header}

      <div className={styles.pageKeysRow}>
        <PageKeys
          items={tabs.items}
          activeId={tabs.activeId}
          onChange={tabs.onChange}
          idPrefix={tabs.idPrefix}
          aria-label={tabs.ariaLabel}
        />
      </div>

      <div className={styles.panelWrap} id={panelId} role="tabpanel" aria-labelledby={tabId}>
        {children}
      </div>

      {overlays}
    </div>
  )
}
