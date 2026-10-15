/** Accent- and case-insensitive text, so "aviacion" finds "Aviación". */
export const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
