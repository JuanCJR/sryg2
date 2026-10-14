import type { FormEvent, ReactNode } from 'react'
import { Lamp } from '../../design-system'
import { TemplateErrorFrame, TemplateLoadingFrame } from './TemplateFrames'
import type { TemplateErrorContent } from './templateTypes'
import clsx from '../../lib/clsx'
import styles from './FormPageTemplate.module.css'

type FormCommon = {
  title: string // the template renders the <h1>
  breadcrumb?: ReactNode
  subject?: ReactNode // who or what the form acts on (compact identity strip)
  overlays?: ReactNode
}

export interface FormBlockedContent {
  title: string
  reason: ReactNode
  /** Typically the single way out of a blocked form (e.g. "Volver al expediente"). */
  action?: ReactNode
}

export type FormPageTemplateProps = FormCommon &
  (
    | { status: 'loading'; loadingLabel: string }
    | { status: 'error'; error: TemplateErrorContent }
    | {
        /** First-level state, not an error: the action is impeded (for example an open block). */
        status: 'blocked'
        blocked: FormBlockedContent
        children?: ReactNode // optional read-only preview
      }
    | {
        status: 'editing' | 'submitting'
        onSubmit: (event: FormEvent<HTMLFormElement>) => void
        errorSummary?: ReactNode // focus target after a failed submit
        /**
         * Sticky summary panel docked beside the sections at desktop, and folded into the
         * sticky bottom bar together with `actions` at tablet/phone (e.g. the Emisión form's
         * "Se emitirá" rail). Fully page-owned content — the template supplies only the slot
         * and its sticky/responsive mechanics, never the summary logic itself.
         */
        rail?: ReactNode
        children: ReactNode // FormSection elements
        actions: ReactNode
      }
  )

/**
 * Minimum contract for every form-style page (Emisión/renovación de licencia, and later
 * Registro de personal, Certificado médico, Parámetros, Perfil). Direction is fixed at
 * `.impeccable/surfaces/es-licenses-pages-emisionlicenciapage-tsx-dbb09bb2.md` ("Sectioned form
 * with fixed summary rail"); the template stays generic and content-agnostic — the rail itself
 * is content the container supplies through `rail`, never template logic. Pages that need no
 * rail (Perfil, Parámetros) simply omit it: `actions` then renders as a plain bottom row.
 *
 * The template renders `<form noValidate>`. While `submitting`, it wraps the sections in a
 * disabled, `aria-busy` `<fieldset>`. `blocked` never shows a submit button.
 */
export function FormPageTemplate(props: FormPageTemplateProps) {
  const { title, breadcrumb, subject, overlays, status } = props
  const isFormStatus = status === 'editing' || status === 'submitting'
  const hasRail = isFormStatus && Boolean(props.rail)

  return (
    <div className={styles.page}>
      {breadcrumb ? <div className={styles.breadcrumbRow}>{breadcrumb}</div> : null}

      <h1 className={styles.title}>{title}</h1>

      {/* Always rendered (even with no content yet) so loading/error reserve the same vertical
          space the identity strip occupies once ready — nothing reflows on resolve. */}
      <div className={styles.subject}>{subject}</div>

      {status === 'loading' ? <TemplateLoadingFrame label={props.loadingLabel} /> : null}
      {status === 'error' ? <TemplateErrorFrame error={props.error} /> : null}

      {status === 'blocked' ? (
        <div className={styles.blockedRow}>
          {/* Matches the Expediente's warning-stack row grammar exactly (hatched lamp cell, caps
              title, detail, full width, 44px min height) rather than a generic Notice — one row
              naming the single impediment that empties the whole page. The subject strip's own
              `StatusBadge` already carries `BLOCKED_STATE_LABEL`'s text (DS-05/OD-07 stand-in);
              this row does not repeat it as a separate badge. */}
          <div className={styles.blockedBanner} role="alert">
            <Lamp status="bloqueada" size="md" />
            <div className={styles.blockedBody}>
              <span className={styles.blockedTitle}>{props.blocked.title}</span>
              <span className={styles.blockedDetail}>{props.blocked.reason}</span>
            </div>
          </div>
          {props.blocked.action ? <div className={styles.blockedAction}>{props.blocked.action}</div> : null}
          {props.children}
        </div>
      ) : null}

      {isFormStatus ? (
        <form noValidate onSubmit={props.onSubmit} className={styles.form}>
          {props.errorSummary}
          <div className={clsx(styles.layout, hasRail && styles.layoutWithRail)}>
            <fieldset
              className={styles.sections}
              disabled={status === 'submitting'}
              aria-busy={status === 'submitting' || undefined}
            >
              {props.children}
            </fieldset>
            {hasRail ? (
              <div className={styles.rail}>
                {props.rail}
                <div className={styles.railActions}>{props.actions}</div>
              </div>
            ) : null}
          </div>
          {hasRail ? null : <div className={styles.actions}>{props.actions}</div>}
        </form>
      ) : null}

      {overlays}
    </div>
  )
}
