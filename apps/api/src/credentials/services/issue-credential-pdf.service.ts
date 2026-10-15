import { can, deriveCredentialStatus, type PermissionModule, type Role, type UserArea } from '@sryg/types'
import type { Clock } from '../../common/clock'
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/domain-errors'
import type { CredentialsTransaction } from '../credentials.types'
import type { CredentialCardKind } from '../dtos/credential-card.dto'
import { verificationUrl } from './card-text'
import type { PdfKitCredentialRenderer } from './pdfkit-credential-renderer'

export interface CredentialPrinter {
  id: string
  role: Role
  area: UserArea
}

export interface CredentialPdfRequest {
  personalId: string
  kind: CredentialCardKind
  credentialId: string
}

export interface CredentialPdf {
  filename: string
  body: Buffer
}

/** The module whose area a Supervisor must belong to in order to print each card (D24). */
const AREA_MODULE: Record<CredentialCardKind, PermissionModule> = {
  license: 'licenses',
  medical: 'medical_certificates',
}
const AUDIT_ENTITY: Record<CredentialCardKind, string> = { license: 'licencia', medical: 'certificado_medico' }
const FILE_PREFIX: Record<CredentialCardKind, string> = {
  license: 'credencial-licencia',
  medical: 'credencial-certificado-medico',
}

/**
 * OUT-02 (`GeneradorCredencialPDF`): prints a license or a medical certificate as a CR80 PDF (D7).
 * It refuses while the person has an active block (D9, BR-07) or once the credential has expired;
 * a credential near expiry is still in force. Each print is audited as `emitir` on the credential.
 */
export class IssueCredentialPdfService {
  constructor(
    private readonly transaction: CredentialsTransaction,
    private readonly renderer: PdfKitCredentialRenderer,
    private readonly clock: Clock,
    private readonly webOrigin: string,
  ) {}

  execute(actor: CredentialPrinter, { personalId, kind, credentialId }: CredentialPdfRequest): Promise<CredentialPdf> {
    // The route already requires `credentials:export`; the area is the credential's own (D24).
    if (!can(actor.role, actor.area, AREA_MODULE[kind], 'write')) throw new ForbiddenError('Forbidden')
    return this.transaction.run(async ({ cards, resources, blocks, validity, audit }) => {
      const card = kind === 'license' ? await cards.license(credentialId) : await cards.medical(credentialId)
      if (!card || card.personalId !== personalId) throw new NotFoundError('Credential not found')
      if (await blocks.hasActiveBlock(personalId)) {
        throw new ConflictError('La persona tiene un bloqueo activo: la credencial no se puede emitir.')
      }
      const threshold = await validity.alertThresholdDays()
      if (deriveCredentialStatus(card.expiryDate, this.clock.today(), threshold.value, false) === 'vencida') {
        throw new ConflictError('La credencial no está vigente: está vencida.')
      }
      const body = await this.renderer.render(card, {
        resources: await resources.read(),
        verificationUrl: verificationUrl(this.webOrigin, card.verificationToken),
      })
      await audit.record({
        actorId: actor.id,
        action: 'emitir',
        entity: AUDIT_ENTITY[kind],
        entityId: card.id,
        changes: { after: { salida: 'credencial_pdf', number: card.number } },
      })
      return { filename: `${FILE_PREFIX[kind]}-${card.number.replace(/[^\w.-]+/g, '_')}.pdf`, body }
    })
  }
}
