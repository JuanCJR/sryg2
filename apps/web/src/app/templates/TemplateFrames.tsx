import { Button, Notice } from '../../design-system'
import type { TemplateEmptyContent, TemplateErrorContent } from './templateTypes'
import styles from './TemplateFrames.module.css'

export interface TemplateLoadingFrameProps {
  /** Visible loading label. Templates whose loading composition needs more (skeletons, tab count) build their own frame instead. */
  label: string
}

/** Minimal quiet loading row, reused by templates whose loading state needs nothing beyond a label. */
export function TemplateLoadingFrame({ label }: TemplateLoadingFrameProps) {
  return (
    <div className={styles.loading} aria-busy="true">
      <p role="status" className={styles.loadingLabel}>
        {label}
      </p>
    </div>
  )
}

export interface TemplateErrorFrameProps {
  error: TemplateErrorContent
}

/**
 * A failed load is an attention state, not neutral status copy — it carries the warning
 * (triangle) glyph via `tone="caution"`, not the neutral info glyph. Every template shares this
 * one frame, so the glyph change applies everywhere a load can fail in one place.
 */
export function TemplateErrorFrame({ error }: TemplateErrorFrameProps) {
  return (
    <Notice
      tone="caution"
      title={error.title}
      action={
        error.onRetry ? (
          <Button variant="secondary" onClick={error.onRetry}>
            {error.retryLabel ?? 'Reintentar'}
          </Button>
        ) : undefined
      }
    >
      {error.message}
    </Notice>
  )
}

export interface TemplateEmptyFrameProps {
  empty: TemplateEmptyContent
}

/** Neutral empty-state block. Visual direction is decided per template at its Impeccable gate; this frame stays unopinionated until then. */
export function TemplateEmptyFrame({ empty }: TemplateEmptyFrameProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{empty.title}</p>
      <div className={styles.emptyMessage}>{empty.message}</div>
      {empty.action ? <div className={styles.emptyAction}>{empty.action}</div> : null}
    </div>
  )
}
