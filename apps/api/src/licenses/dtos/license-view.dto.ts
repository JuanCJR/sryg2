import type {
  ClassRatingDto,
  LicenseDto,
  LicenseListItemDto,
  TypeRatingDto,
} from '@sryg/types'

/** A rating as stored: its status is derived by the services (D17, BR-12). */
export type TypeRatingView = Omit<TypeRatingDto, 'status'>
export type ClassRatingView = Omit<ClassRatingDto, 'status'>

export type LicenseView = Omit<LicenseDto, 'status' | 'typeRatings' | 'classRatings'> & {
  typeRatings: TypeRatingView[]
  classRatings: ClassRatingView[]
}

export type LicenseListItemView = Omit<LicenseListItemDto, 'status'>
