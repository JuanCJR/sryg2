import { useState, type ReactNode } from 'react'
import { Moon, Sun, UserPlus } from 'lucide-react'
import {
  Avatar,
  Breadcrumb,
  BrandMark,
  Button,
  Checkbox,
  ConfirmDialog,
  DateInput,
  FormField,
  IconButton,
  Input,
  Lamp,
  Label,
  Notice,
  PageKeys,
  Pagination,
  Radio,
  Select,
  SearchBar,
  StatusBadge,
  Tooltip,
  WarningStack,
  useTheme,
  useToast,
  type LampStatus,
  type PageKeyItem,
} from '../design-system'
import styles from './CatalogPage.module.css'

const NEUTRAL_RAMP: Array<{ token: string; role: string }> = [
  { token: '--n-0', role: 'Night bg / day inverse-fg' },
  { token: '--n-1', role: 'Night bg' },
  { token: '--n-2', role: 'Night surface' },
  { token: '--n-3', role: 'Night surface-raised' },
  { token: '--n-4', role: 'Night rule / day control-border-strong' },
  { token: '--n-5', role: 'Night control-border / day fg-muted' },
  { token: '--n-6', role: 'Control border (both)' },
  { token: '--n-7', role: 'Night fg-muted' },
  { token: '--n-8', role: 'Night control-border-strong / day control-border' },
  { token: '--n-9', role: 'Night fg / day rule, surface-raised' },
  { token: '--n-10', role: 'Night fg / day bg' },
]

const SEMANTIC_TOKENS = [
  '--bg',
  '--surface',
  '--surface-raised',
  '--fg',
  '--fg-muted',
  '--rule',
  '--control-border',
  '--inverse-bg',
  '--focus',
]

const TYPE_SCALE: Array<{ token: string; sample: string }> = [
  { token: '--fs-xs', sample: 'Caption / labels' },
  { token: '--fs-sm', sample: 'Secondary text' },
  { token: '--fs-base', sample: 'Body text' },
  { token: '--fs-md', sample: 'Emphasis' },
  { token: '--fs-lg', sample: 'Section heading' },
  { token: '--fs-xl', sample: 'Page heading' },
  { token: '--fs-2xl', sample: 'Identity headline' },
]

const SPACING_SCALE = ['--s-1', '--s-2', '--s-3', '--s-4', '--s-5', '--s-6', '--s-7', '--s-8', '--s-9']

const LAMP_STATUSES: LampStatus[] = ['bloqueada', 'vencida', 'proxima', 'activa', 'sin-datos']

const CATALOG_PAGE_KEYS: PageKeyItem[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'licencias', label: 'Licencias', problem: 'vencida' },
  { id: 'historial', label: 'Historial' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

// Reads the resolved hex via getComputedStyle; parent keys this by theme so a switch remounts and re-reads it.
function RampSwatch({ token, role }: { token: string; role: string }) {
  const [hex] = useState(() => getComputedStyle(document.documentElement).getPropertyValue(token).trim())
  return (
    <div className={styles.swatch}>
      <div className={styles.swatchChip} style={{ background: `var(${token})` }} />
      <span className={styles.swatchLabel}>{token}</span>
      <span className={styles.swatchHex}>{hex}</span>
      <span className={styles.swatchLabel}>{role}</span>
    </div>
  )
}

function Entry({ title, rule, children }: { title: string; rule: string; children: ReactNode }) {
  return (
    <div className={styles.entry}>
      <p className={styles.entryTitle}>{title}</p>
      <p className={styles.rule}>{rule}</p>
      <div className={styles.example}>{children}</div>
    </div>
  )
}

function ThemeToggle() {
  const { resolved, setMode } = useTheme()
  const next = resolved === 'day' ? 'night' : 'day'
  return (
    <Button variant="secondary" size="sm" icon={resolved === 'day' ? Moon : Sun} onClick={() => setMode(next)}>
      {resolved === 'day' ? 'Switch to night' : 'Switch to day'}
    </Button>
  )
}

export function CatalogPage() {
  const toast = useToast()
  const { resolved: theme } = useTheme()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(2)
  const [checked, setChecked] = useState(true)
  const [radioValue, setRadioValue] = useState<'a' | 'b' | 'c'>('a')
  const [activeKey, setActiveKey] = useState('licencias')
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.pageTitle}>SRYG design system catalog</h1>
        <p className={styles.pageSubtitle}>
          Development reference only (DEV builds). Live components, not mock copies — every example below renders the
          real design-system export. <ThemeToggle />
        </p>
      </header>

      <Section title="Tokens">
        <Entry title="Neutral ramp" rule="One 11-step cool-neutral ramp supplies every tone in both modes.">
          <div className={styles.swatchRow}>
            {NEUTRAL_RAMP.map((n) => (
              <RampSwatch key={`${n.token}-${theme}`} token={n.token} role={n.role} />
            ))}
          </div>
        </Entry>

        <Entry title="Semantic tokens (current mode)" rule="Resolve live — toggle the theme above to see them flip.">
          <div className={styles.swatchRow}>
            {SEMANTIC_TOKENS.map((token) => (
              <div key={token} className={styles.swatch}>
                <div
                  className={styles.swatchChip}
                  style={{ background: `var(${token})`, border: '1px solid var(--control-border)' }}
                />
                <span className={styles.swatchLabel}>{token}</span>
              </div>
            ))}
          </div>
        </Entry>

        <Entry
          title="Status lamps"
          rule="Status is never color alone — lamp (icon) + achromatic text label everywhere."
        >
          <div className={styles.swatchRow}>
            {(['sm', 'md', 'lg'] as const).map((size) =>
              LAMP_STATUSES.map((status) => (
                <div key={`${size}-${status}`} className={styles.swatch}>
                  <Lamp status={status} size={size} />
                  <span className={styles.swatchLabel}>
                    {status} · {size}
                  </span>
                </div>
              )),
            )}
          </div>
        </Entry>

        <Entry
          title="Type scale"
          rule="B612 for text. B612 Mono only inside table cells that need column alignment (Número, Emitida, Vence, Restante, Fecha y hora) and pagination/count figures. Every other numeric value (headline cédula, DATOS values, audit timestamps, the top-strip clock, warning-stack relative figures, dialog hints) stays B612 with font-variant-numeric: tabular-nums."
        >
          <div>
            {TYPE_SCALE.map((row) => (
              <div key={row.token} className={styles.typeRow}>
                <span className={styles.typeSize}>{row.token}</span>
                <span style={{ fontSize: `var(${row.token})` }}>{row.sample}</span>
              </div>
            ))}
          </div>
        </Entry>

        <Entry title="Spacing (4px base)" rule="Every gap and padding value comes from this scale.">
          <div>
            {SPACING_SCALE.map((token) => (
              <div key={token} className={styles.spacingRow}>
                <span className={styles.spacingLabel}>{token}</span>
                <div className={styles.spacingChip} style={{ width: `var(${token})` }} />
              </div>
            ))}
          </div>
        </Entry>
      </Section>

      <Section title="Atoms">
        <Entry title="Button" rule="Primary for the one committing action per view; secondary/ghost for the rest.">
          <Button variant="primary" icon={UserPlus}>
            Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </Entry>
        <Entry title="IconButton" rule="Icon-only control — `aria-label` is required, never optional.">
          <IconButton icon={UserPlus} aria-label="Ejemplo" />
        </Entry>
        <Entry
          title="Input / Select / DateInput"
          rule="`mono` on Input for cédulas, license numbers, and other figures."
        >
          <FormField label="Cédula">
            {(controlProps) => <Input mono placeholder="V-00000000" style={{ maxWidth: 160 }} {...controlProps} />}
          </FormField>
          <FormField label="Opción">
            {(controlProps) => (
              <Select defaultValue="a" {...controlProps}>
                <option value="a">Opción A</option>
                <option value="b">Opción B</option>
              </Select>
            )}
          </FormField>
          <FormField label="Fecha">{(controlProps) => <DateInput {...controlProps} />}</FormField>
        </Entry>
        <Entry title="Checkbox / Radio" rule="Always paired with a visible label; never the sole means of selection.">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} /> Notify
          </label>
          <div
            role="radiogroup"
            aria-label="Ejemplo de radio"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {(['a', 'b', 'c'] as const).map((value) => (
              <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio
                  name="catalog-radio-example"
                  checked={radioValue === value}
                  onChange={() => setRadioValue(value)}
                />
                Opción {value.toUpperCase()}
              </label>
            ))}
          </div>
        </Entry>
        <Entry title="Label" rule="Pairs with `FormField` via generated ids; `required` renders a marked asterisk.">
          <Label required>Campo obligatorio</Label>
        </Entry>
        <Entry title="Avatar" rule="Falls back to a neutral silhouette on a missing or failed `src`.">
          <Avatar alt="Synthetic photo" size="sm" />
          <Avatar alt="Synthetic photo" size="lg" />
        </Entry>
        <Entry
          title="Tooltip"
          rule="Chains the child's own handlers and merges `aria-describedby` — never replaces them."
        >
          <Tooltip content="Additional context on hover or focus">
            <Button variant="ghost">Hover me</Button>
          </Tooltip>
        </Entry>
        <Entry title="BrandMark" rule="The SRYG mark, blended per mode — never redrawn or recolored.">
          <BrandMark size={32} />
        </Entry>
      </Section>

      <Section title="Molecules">
        <Entry
          title="StatusBadge"
          rule="Lamp + label + optional mono detail — the only place status renders as a badge."
        >
          <StatusBadge status="activa" />
          <StatusBadge status="proxima" detail="21 d" />
          <StatusBadge status="vencida" detail="12 d" />
          <StatusBadge status="bloqueada" />
        </Entry>
        <Entry title="Notice" rule="Persistent by default — a real problem does not self-dismiss.">
          <Notice tone="info" title="Informational">
            Explains context without demanding action.
          </Notice>
        </Entry>
        <Entry title="SearchBar" rule="A labelled search form, not a bare input.">
          <SearchBar label="Search" value={search} onChange={setSearch} />
        </Entry>
        <Entry
          title="PageKeys"
          rule="Roving-tabindex tabs; require an `idPrefix` so ids never collide across instances."
        >
          <PageKeys
            items={CATALOG_PAGE_KEYS}
            activeId={activeKey}
            onChange={setActiveKey}
            idPrefix="catalog"
            aria-label="Example pages"
          />
        </Entry>
        <Entry title="Breadcrumb" rule="Valid `<ol>` markup; separators live inside each `<li>`, marked `aria-hidden`.">
          <Breadcrumb items={[{ label: 'Personal', href: '#' }, { label: 'Expediente' }]} />
        </Entry>
        <Entry title="Pagination" rule="Only the page figures use mono — the surrounding words stay in B612.">
          <Pagination page={page} pageCount={7} onPageChange={setPage} />
        </Entry>
        <Entry title="ConfirmDialog" rule="Typed confirmation always resets on open, however the dialog last closed.">
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Open dialog
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            title="Example confirmation"
            consequence="This is a demo consequence sentence."
            confirmText="CONFIRMAR"
            onConfirm={() => setConfirmOpen(false)}
            onCancel={() => setConfirmOpen(false)}
          />
        </Entry>
        <Entry title="Toast" rule="Errors persist until dismissed; other tones auto-dismiss after 5s.">
          <Button variant="secondary" onClick={() => toast.show({ tone: 'info', message: 'Example toast message.' })}>
            Show toast
          </Button>
        </Entry>
      </Section>

      <Section title="Organisms">
        <Entry title="WarningStack — 4 messages" rule="Data-agnostic: the caller derives and sorts `messages`.">
          <WarningStack
            messages={[
              {
                id: '1',
                status: 'bloqueada',
                title: 'Bloqueo abierto',
                detail: 'Ejemplo de bloqueo administrativo.',
                relativeLabel: 'hace 8 d',
              },
              {
                id: '2',
                status: 'vencida',
                title: 'Habilitación vencida',
                detail: 'Ejemplo de vencimiento.',
                relativeLabel: 'hace 12 d',
              },
              {
                id: '3',
                status: 'proxima',
                title: 'Próxima a vencer',
                detail: 'Ejemplo de aviso próximo.',
                relativeLabel: '21 d',
              },
              {
                id: '4',
                status: 'proxima',
                title: 'Certificado próximo',
                detail: 'Otro ejemplo próximo.',
                relativeLabel: '34 d',
              },
            ]}
            onSelect={() => {}}
          />
        </Entry>
        <Entry title="WarningStack — 0 messages" rule="Zero-warning state: one quiet unlit-lamp line, no header.">
          <WarningStack messages={[]} onSelect={() => {}} />
        </Entry>
      </Section>
    </div>
  )
}
