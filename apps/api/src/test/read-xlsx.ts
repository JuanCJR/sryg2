import { inflateRawSync } from 'node:zlib'

/** The parts of a ZIP archive by path (test helper: deflate or stored entries only). */
export function unzip(archive: Buffer): Map<string, Buffer> {
  const parts = new Map<string, Buffer>()
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = archive.readUInt16LE(end + 10)
  let at = archive.readUInt32LE(end + 16)
  for (let i = 0; i < count; i++) {
    const method = archive.readUInt16LE(at + 10)
    const size = archive.readUInt32LE(at + 20)
    const nameLength = archive.readUInt16LE(at + 28)
    const extra = archive.readUInt16LE(at + 30)
    const comment = archive.readUInt16LE(at + 32)
    const local = archive.readUInt32LE(at + 42)
    const name = archive.toString('utf8', at + 46, at + 46 + nameLength)
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28)
    const data = archive.subarray(start, start + size)
    parts.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data))
    at += 46 + nameLength + extra + comment
  }
  return parts
}

const unescape = (text: string) =>
  text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&amp;', '&')

/** The first worksheet of an .xlsx as rows of cell values (blank cells are ''), top to bottom. */
export function readXlsxRows(file: Buffer): Array<Array<string | number>> {
  const xml = unzip(file).get('xl/worksheets/sheet1.xml')?.toString('utf8')
  if (!xml) throw new Error('No worksheet in the workbook')
  return [...xml.matchAll(/<row [^>]*>(.*?)<\/row>/gs)].map(([, cells]) =>
    [...cells!.matchAll(/<c r="[A-Z]+\d+"[^>]*?(?:\/>|>(.*?)<\/c>)/gs)].map(([whole, inner]) => {
      if (!inner) return ''
      const text = /<t[^>]*>(.*?)<\/t>/s.exec(inner)
      if (text) return unescape(text[1]!)
      const value = /<v>(.*?)<\/v>/.exec(inner)
      return value && !whole.includes('t="') ? Number(value[1]) : (value?.[1] ?? '')
    }),
  )
}
