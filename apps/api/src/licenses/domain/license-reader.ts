import type {
  ClassRatingDto,
  LicenseDto,
  LicenseHistoryEntryDto,
  LicenseListItemDto,
  LicenseListQuery,
  Paginated,
  TypeRatingDto,
} from '@sryg/types'

/** A rating as stored: its status is derived by the application layer (D17, BR-12). */
export type TypeRatingView = Omit<TypeRatingDto, 'status'>
export type ClassRatingView = Omit<ClassRatingDto, 'status'>

export type LicenseView = Omit<LicenseDto, 'status' | 'typeRatings' | 'classRatings'> & {
  typeRatings: TypeRatingView[]
  classRatings: ClassRatingView[]
}

export type LicenseListItemView = Omit<LicenseListItemDto, 'status'>

/** Read side of the module: queries with no side effects. */
export interface LicenseReader {
  findById(id: string): Promise<LicenseView | null>
  findByPerson(personalId: string): Promise<LicenseView[]>
  list(query: LicenseListQuery): Promise<Paginated<LicenseListItemView>>
  /** Audit entries of the license and of its ratings, newest first. */
  history(licenseId: string): Promise<LicenseHistoryEntryDto[]>
}
