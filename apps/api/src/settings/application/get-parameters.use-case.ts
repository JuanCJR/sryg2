import {
  ALERT_THRESHOLD_KEY,
  MEDICAL_VALIDITY_KEYS,
  type ParameterDto,
  RAV67_CLASSES,
  SETTING_KEYS,
  type SettingsParametersDto,
} from '@sryg/types'
import type { SystemParameter, SystemParameterRepository } from '../domain/system-parameter'

const toDto = ({ value, isPlaceholder, updatedAt }: SystemParameter): ParameterDto => ({
  value,
  isPlaceholder,
  updatedAt: updatedAt.toISOString(),
})

/** Alert threshold and validity per RAV 67 class (D3), each with its placeholder flag. */
export class GetParametersUseCase {
  constructor(private readonly parameters: Pick<SystemParameterRepository, 'findMany'>) {}

  async execute(): Promise<SettingsParametersDto> {
    const rows = new Map((await this.parameters.findMany(SETTING_KEYS)).map((row) => [row.key, row]))
    const get = (key: (typeof SETTING_KEYS)[number]) => toDto(rows.get(key)!)
    return {
      alertThresholdDays: get(ALERT_THRESHOLD_KEY),
      medicalValidityMonths: Object.fromEntries(
        RAV67_CLASSES.map((rav67Class) => [rav67Class, get(MEDICAL_VALIDITY_KEYS[rav67Class])]),
      ) as SettingsParametersDto['medicalValidityMonths'],
    }
  }
}
