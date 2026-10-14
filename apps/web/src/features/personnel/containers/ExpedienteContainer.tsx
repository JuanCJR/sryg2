import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  Breadcrumb,
  ConfirmDialog,
  WarningStack,
  useToast,
  worstStatus,
  type PageKeyItem,
} from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { ErrorTemplate } from '../../../app/templates/ErrorTemplate'
import { DetailPageTemplate } from '../../../app/templates/DetailPageTemplate'
import { licenseForm } from '../../../app/routes'
import { DEMO_PERSON_ID, buildExpedienteFor, buildSinAlertasExpediente } from '../data/demoData'
import { DEMO_NEAR_EXPIRY_DAYS } from '../domain/config'
import { daysUntil, deriveOwnStatus, deriveWarnings, effectiveStatus, pageKeyProblems } from '../domain/status'
import { formatDate, formatDateTime, formatRemaining } from '../domain/format'
import type { ExpedienteData, PageKeyId, Warning } from '../domain/types'
import type { ConditionRow } from '../components/ConditionTable'
import { DatosPanel } from '../components/DatosPanel'
import { LicenciasPanel } from '../components/LicenciasPanel'
import { HabilitacionesPanel } from '../components/HabilitacionesPanel'
import { MedicoPanel } from '../components/MedicoPanel'
import { BloqueosPanel, type BloqueoRowView } from '../components/BloqueosPanel'
import { HistorialPanel } from '../components/HistorialPanel'
import { IdentityHeader } from '../components/IdentityHeader'
import { ExpedienteHeaderSkeleton } from '../components/ExpedienteHeaderSkeleton'

const ID_PREFIX = 'expediente'

const PAGE_LABEL: Record<PageKeyId, string> = {
  datos: 'Datos',
  licencias: 'Licencias',
  habilitaciones: 'Habilitaciones',
  medico: 'Médico',
  bloqueos: 'Bloqueos',
  historial: 'Historial',
}

const PAGE_ORDER: PageKeyId[] = ['datos', 'licencias', 'habilitaciones', 'medico', 'bloqueos', 'historial']

type LoadState = 'loading' | 'error' | 'ready'

function buildAnnouncement(warning: Warning, data: ExpedienteData): string {
  if (warning.page === 'licencias' && data.licencia.bloqueadaPorId) {
    const affected = data.habilitaciones.filter((h) => h.bloqueadaPorId === data.licencia.bloqueadaPorId).length
    return `Mostrando la licencia detenida por ${data.licencia.bloqueadaPorId}; ${affected} habilitaciones afectadas en HABILITACIONES.`
  }
  return `Mostrando ${warning.title.toLowerCase()} en ${PAGE_LABEL[warning.page].toUpperCase()}.`
}

export function ExpedienteContainer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { role, can } = useRole()
  const toast = useToast()

  const [today] = useState(() => new Date())
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [data, setData] = useState<ExpedienteData | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [highlight, setHighlight] = useState<{ rowId: string; nonce: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const estadoParam = searchParams.get('estado')
  const pageParam = searchParams.get('pagina')

  useEffect(() => {
    let cancelled = false
    const markLoading = () => setLoadState('loading')
    markLoading()
    if (estadoParam === 'cargando') {
      // Stays loading forever (demo state) — no timer to resolve it.
      return () => {
        cancelled = true
      }
    }
    const timer = setTimeout(() => {
      if (cancelled) {
        return
      }
      if (estadoParam === 'error') {
        setLoadState('error')
        return
      }
      const found = id ? buildExpedienteFor(id, today) : undefined
      const built =
        found && id === DEMO_PERSON_ID && estadoParam === 'sin-alertas' ? buildSinAlertasExpediente(today) : found
      setData(built ?? null)
      setLoadState('ready')
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [estadoParam, today, retryNonce, id])

  const warnings = useMemo(() => (data ? deriveWarnings(data, today) : []), [data, today])
  const problems = useMemo(() => (data ? pageKeyProblems(data, today) : {}), [data, today])
  const initialPage = useMemo<PageKeyId>(() => warnings[0]?.page ?? 'datos', [warnings])

  // §4 matrix: Consulta lacks audit access, so a stale/typed ?pagina=historial falls back instead of rendering it.
  const canViewAudit = can('audit:view')
  // ?pagina= is unvalidated user input: accept only if it names a real, role-visible page key.
  const isKnownPage = (value: string): value is PageKeyId => (PAGE_ORDER as string[]).includes(value)
  const requestedPage =
    pageParam && isKnownPage(pageParam) && (pageParam !== 'historial' || canViewAudit) ? pageParam : null
  const activePage: PageKeyId = requestedPage ?? initialPage

  const handleKeyChange = (rawId: string) => {
    const nextId = rawId as PageKeyId
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('pagina', nextId)
        return next
      },
      { replace: true },
    )
    setHighlight(null)
    setAnnouncement('')
  }

  const handleWarningSelect = (warningId: string) => {
    const warning = warnings.find((w) => w.id === warningId)
    if (!warning || !data) {
      return
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('pagina', warning.page)
        return next
      },
      { replace: true },
    )
    const rowId = warning.linkedRowIds[0]
    if (rowId) {
      // Fresh nonce every select so ConditionTable's keyed overlay restarts even on the same row.
      setHighlight({ rowId, nonce: Date.now() })
    }
    setAnnouncement(buildAnnouncement(warning, data))
  }

  // Depends on activePage too: page and highlight can commit in separate passes, so wait for the new panel plus one frame before focusing.
  useEffect(() => {
    if (!highlight) {
      return
    }
    const frame = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-row-id="${highlight.rowId}"]`)
      if (!el) {
        return
      }
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
      el.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [highlight, activePage])

  const handleRetry = () => setRetryNonce((n) => n + 1)

  const isConsulta = role === 'consulta'

  if (loadState === 'error') {
    return (
      <DetailPageTemplate
        status="error"
        error={{
          title: 'No se pudo cargar el expediente',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: handleRetry,
        }}
      />
    )
  }

  if (loadState === 'loading') {
    return (
      <DetailPageTemplate
        status="loading"
        banner={<WarningStack messages={[]} onSelect={() => {}} loading />}
        loadingLabel="Cargando expediente"
        headerSkeleton={<ExpedienteHeaderSkeleton />}
        tabCount={PAGE_ORDER.length}
      />
    )
  }

  if (!data) {
    return (
      <ErrorTemplate
        code="404"
        title="Persona no encontrada"
        explanation="No existe un expediente sintético con esa cédula o identificador en esta demostración."
      />
    )
  }

  const canIssueRenew = can('licenses:issueRenew')
  const canRegisterBlock = can('blocking:register')
  const canEditData = can('personnel:write')
  const canPrint = can('credentials:print')
  const canWriteMedical = can('medical:write')
  const canResolveBlock = can('blocking:resolve')

  const licenciaEffective = effectiveStatus(data.licencia.ownStatus, data.licencia.bloqueadaPorId)
  const overallWorst =
    worstStatus([
      licenciaEffective,
      ...data.habilitaciones.map((h) => deriveOwnStatus(h.vence, today)),
      deriveOwnStatus(data.certificado.vence, today),
    ]) ?? 'activa'

  // Only an 'abierto' block counts as blocking — a stale bloqueadaPorId pointing at a resolved block never shows.
  const openBlock = data.licencia.bloqueadaPorId
    ? data.bloqueos.find((b) => b.id === data.licencia.bloqueadaPorId && b.estado === 'abierto')
    : undefined
  const lastAudit = data.historial[0]

  const licenciaRow: ConditionRow = {
    id: data.licencia.id,
    status: licenciaEffective,
    nombre: data.licencia.tipo,
    numero: data.licencia.numero,
    emitidaLabel: formatDate(data.licencia.emitida),
    venceLabel: formatDate(data.licencia.vence),
    restanteLabel: formatRemaining(daysUntil(data.licencia.vence, today)),
  }

  const habilitacionRows: ConditionRow[] = data.habilitaciones.map((h) => ({
    id: h.id,
    status: deriveOwnStatus(h.vence, today),
    nombre: h.nombre,
    emitidaLabel: formatDate(h.emitida),
    venceLabel: formatDate(h.vence),
    restanteLabel: formatRemaining(daysUntil(h.vence, today)),
    blockedMarker: h.bloqueadaPorId ? `Detenida por bloqueo ${h.bloqueadaPorId}` : undefined,
  }))

  const certRow: ConditionRow = {
    id: data.certificado.id,
    status: deriveOwnStatus(data.certificado.vence, today),
    nombre: `${data.certificado.norma} ${data.certificado.tipo}`,
    emitidaLabel: formatDate(data.certificado.emitida),
    venceLabel: formatDate(data.certificado.vence),
    restanteLabel: formatRemaining(daysUntil(data.certificado.vence, today)),
    restriccionLabel: data.certificado.restriccion,
  }

  const bloqueoRows: BloqueoRowView[] = data.bloqueos.map((b) => ({
    id: b.id,
    tipo: b.tipo,
    motivo: b.motivo,
    registradoLabel:
      b.estado === 'abierto'
        ? `Registrado ${formatDate(b.registradoEn)} por ${b.registradoPor}`
        : `Registrado ${formatDate(b.registradoEn)} por ${b.registradoPor} · Resuelto ${formatDate(b.resueltoEn ?? b.registradoEn)} por ${b.resueltoPor ?? '—'}`,
    estado: b.estado,
    detieneLabel:
      b.detieneLicenciaIds.length > 0
        ? `1 licencia y ${data.habilitaciones.filter((h) => h.bloqueadaPorId === b.id).length} habilitaciones`
        : '—',
    canResolve: b.estado === 'abierto' && canResolveBlock,
  }))

  const pageKeyItems: PageKeyItem[] = PAGE_ORDER.filter((pageId) => pageId !== 'historial' || canViewAudit).map(
    (pageId) => ({
      id: pageId,
      label: PAGE_LABEL[pageId],
      problem: problems[pageId],
    }),
  )

  const demoAction = (label: string) => toast.show({ tone: 'info', message: `Acción de demostración: ${label}.` })

  const resolveBlock = (blockId: string) => {
    setData((current) => {
      if (!current) {
        return current
      }
      const nowIso = new Date().toISOString()
      const bloqueos = current.bloqueos.map((b) =>
        b.id === blockId ? { ...b, estado: 'resuelto' as const, resueltoEn: nowIso, resueltoPor: 'operador.demo' } : b,
      )
      const licencia =
        current.licencia.bloqueadaPorId === blockId
          ? { ...current.licencia, bloqueadaPorId: undefined }
          : current.licencia
      const habilitaciones = current.habilitaciones.map((h) =>
        h.bloqueadaPorId === blockId ? { ...h, bloqueadaPorId: undefined } : h,
      )
      const historial = [
        {
          id: `hist-resolve-${blockId}-${Date.now()}`,
          fecha: nowIso,
          actor: 'operador.demo',
          accion: 'Resolución de bloqueo' as const,
          entidad: 'Bloqueo' as const,
          detalle: `Resolución del bloqueo ${blockId}.`,
        },
        ...current.historial,
      ]
      return { ...current, bloqueos, licencia, habilitaciones, historial }
    })
    toast.show({ tone: 'info', message: `Bloqueo ${blockId} resuelto (demostración).` })
    setResolvingId(null)
  }

  const auditText = lastAudit ? `Última modificación: ${lastAudit.actor} ·` : 'Sin modificaciones registradas.'
  const auditFigure = lastAudit ? formatDateTime(lastAudit.fecha) : ''

  const renderPanel = () => {
    switch (activePage) {
      case 'datos':
        return <DatosPanel person={data.person} />
      case 'licencias':
        return (
          <LicenciasPanel
            rows={[licenciaRow]}
            nearExpiryDays={DEMO_NEAR_EXPIRY_DAYS}
            highlightedId={highlight?.rowId}
            highlightNonce={highlight?.nonce}
          />
        )
      case 'habilitaciones':
        return (
          <HabilitacionesPanel
            groupLabel={`${data.licencia.tipo} · ${data.licencia.numero}`}
            rows={habilitacionRows}
            nearExpiryDays={DEMO_NEAR_EXPIRY_DAYS}
            highlightedId={highlight?.rowId}
            highlightNonce={highlight?.nonce}
          />
        )
      case 'medico':
        return (
          <MedicoPanel
            rows={[certRow]}
            nearExpiryDays={DEMO_NEAR_EXPIRY_DAYS}
            canWriteMedical={canWriteMedical}
            onRegisterOrRenew={() => demoAction('Registrar o renovar certificado')}
            highlightedId={highlight?.rowId}
            highlightNonce={highlight?.nonce}
          />
        )
      case 'bloqueos':
        return <BloqueosPanel rows={bloqueoRows} onResolve={setResolvingId} />
      case 'historial':
        return <HistorialPanel entries={data.historial} />
      default:
        return null
    }
  }

  const resolvingBlock = resolvingId ? data.bloqueos.find((b) => b.id === resolvingId) : undefined

  return (
    <DetailPageTemplate
      status="ready"
      breadcrumb={<Breadcrumb items={[{ label: 'Personal', href: '/personal' }, { label: data.person.cedula }]} />}
      banner={
        <WarningStack
          messages={warnings.map((w) => ({
            id: w.id,
            status: w.status,
            title: w.title,
            detail: w.detail,
            relativeLabel: w.relativeLabel,
          }))}
          onSelect={handleWarningSelect}
        />
      }
      announcement={announcement}
      header={
        <IdentityHeader
          person={data.person}
          worst={overallWorst}
          auditText={auditText}
          auditFigure={auditFigure}
          onAuditClick={() => handleKeyChange('historial')}
          hasOpenBlock={Boolean(openBlock)}
          openBlockId={openBlock?.id}
          isConsulta={isConsulta}
          canIssueRenew={canIssueRenew}
          canRegisterBlock={canRegisterBlock}
          canEditData={canEditData}
          canPrint={canPrint}
          onIssueRenew={() => navigate(licenseForm(data.person.id))}
          onRegisterBlock={() => demoAction('Registrar bloqueo')}
          onEditData={() => demoAction('Editar datos')}
          onPrint={() => demoAction('Imprimir credencial')}
        />
      }
      tabs={{
        idPrefix: ID_PREFIX,
        ariaLabel: 'Páginas del expediente',
        items: pageKeyItems,
        activeId: activePage,
        onChange: handleKeyChange,
      }}
      overlays={
        <ConfirmDialog
          open={Boolean(resolvingBlock)}
          title="Resolver bloqueo"
          consequence={
            resolvingBlock
              ? `Al resolver ${resolvingBlock.id} se levanta el impedimento y la emisión vuelve a estar permitida. La acción queda registrada en la auditoría a su nombre.`
              : ''
          }
          confirmText={data.person.cedula}
          onConfirm={() => resolvingBlock && resolveBlock(resolvingBlock.id)}
          onCancel={() => setResolvingId(null)}
        />
      }
    >
      {renderPanel()}
    </DetailPageTemplate>
  )
}
