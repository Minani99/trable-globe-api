export interface PhotoMetadata {
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  dateSource: "exif" | "file" | null;
}

const JPEG_EXIF_SCAN_BYTES = 512 * 1024;

export async function readPhotoMetadata(file: File): Promise<PhotoMetadata> {
  let exif: Omit<PhotoMetadata, "dateSource"> = { takenAt: null, latitude: null, longitude: null };
  if (file.type === "image/jpeg") {
    try {
      exif = parseJpegExifMetadata(await file.slice(0, JPEG_EXIF_SCAN_BYTES).arrayBuffer());
    } catch {
      // Metadata is optional. A malformed EXIF block must never block an upload.
    }
  }

  if (exif.takenAt) return { ...exif, dateSource: "exif" };
  const fileDate = localDate(file.lastModified);
  return { ...exif, takenAt: fileDate, dateSource: fileDate ? "file" : null };
}

export function parseJpegExifMetadata(buffer: ArrayBuffer): Omit<PhotoMetadata, "dateSource"> {
  const empty = { takenAt: null, latitude: null, longitude: null };
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return empty;

  let markerOffset = 2;
  while (markerOffset + 4 <= view.byteLength) {
    if (bytes[markerOffset] !== 0xff) {
      markerOffset += 1;
      continue;
    }
    const marker = bytes[markerOffset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x00 || marker === 0xff) {
      markerOffset += 1;
      continue;
    }

    const segmentLength = view.getUint16(markerOffset + 2, false);
    if (segmentLength < 2 || markerOffset + 2 + segmentLength > view.byteLength) break;
    const payloadOffset = markerOffset + 4;
    if (marker === 0xe1 && hasExifSignature(bytes, payloadOffset)) {
      return parseTiffExif(view, payloadOffset + 6, markerOffset + 2 + segmentLength);
    }
    markerOffset += 2 + segmentLength;
  }
  return empty;
}

function parseTiffExif(view: DataView, tiffStart: number, segmentEnd: number): Omit<PhotoMetadata, "dateSource"> {
  const empty = { takenAt: null, latitude: null, longitude: null };
  if (tiffStart + 8 > segmentEnd) return empty;
  const order = view.getUint16(tiffStart, false);
  const littleEndian = order === 0x4949;
  if (!littleEndian && order !== 0x4d4d) return empty;
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return empty;

  const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const firstIfd = readIfd(view, tiffStart, tiffStart + firstIfdOffset, segmentEnd, littleEndian);
  if (!firstIfd) return empty;

  const exifPointer = readUnsigned(firstIfd.get(0x8769), view, tiffStart, segmentEnd, littleEndian);
  const gpsPointer = readUnsigned(firstIfd.get(0x8825), view, tiffStart, segmentEnd, littleEndian);
  const exifIfd = exifPointer === null
    ? null
    : readIfd(view, tiffStart, tiffStart + exifPointer, segmentEnd, littleEndian);
  const gpsIfd = gpsPointer === null
    ? null
    : readIfd(view, tiffStart, tiffStart + gpsPointer, segmentEnd, littleEndian);

  const dateText = readAscii(exifIfd?.get(0x9003) ?? exifIfd?.get(0x9004) ?? firstIfd.get(0x0132), view, tiffStart, segmentEnd, littleEndian);
  const takenAt = exifDate(dateText);
  if (!gpsIfd) return { ...empty, takenAt };

  const latitudeRef = readAscii(gpsIfd.get(0x0001), view, tiffStart, segmentEnd, littleEndian)?.toUpperCase();
  const longitudeRef = readAscii(gpsIfd.get(0x0003), view, tiffStart, segmentEnd, littleEndian)?.toUpperCase();
  const latitudeParts = readRationals(gpsIfd.get(0x0002), view, tiffStart, segmentEnd, littleEndian);
  const longitudeParts = readRationals(gpsIfd.get(0x0004), view, tiffStart, segmentEnd, littleEndian);
  const latitude = gpsCoordinate(latitudeParts, latitudeRef, 90);
  const longitude = gpsCoordinate(longitudeParts, longitudeRef, 180);
  return { takenAt, latitude, longitude };
}

interface IfdEntry {
  type: number;
  count: number;
  valueFieldOffset: number;
}

function readIfd(
  view: DataView,
  tiffStart: number,
  offset: number,
  end: number,
  littleEndian: boolean,
): Map<number, IfdEntry> | null {
  if (offset < tiffStart || offset + 2 > end) return null;
  const count = view.getUint16(offset, littleEndian);
  if (offset + 2 + count * 12 > end) return null;
  const entries = new Map<number, IfdEntry>();
  for (let index = 0; index < count; index += 1) {
    const entryOffset = offset + 2 + index * 12;
    entries.set(view.getUint16(entryOffset, littleEndian), {
      type: view.getUint16(entryOffset + 2, littleEndian),
      count: view.getUint32(entryOffset + 4, littleEndian),
      valueFieldOffset: entryOffset + 8,
    });
  }
  return entries;
}

function entryDataOffset(
  entry: IfdEntry,
  view: DataView,
  tiffStart: number,
  end: number,
  littleEndian: boolean,
): { offset: number; byteLength: number } | null {
  const typeSize = entry.type === 1 || entry.type === 2 || entry.type === 7
    ? 1
    : entry.type === 3
      ? 2
      : entry.type === 4 || entry.type === 9
        ? 4
        : entry.type === 5 || entry.type === 10
          ? 8
          : 0;
  const byteLength = typeSize * entry.count;
  if (!typeSize || !Number.isSafeInteger(byteLength) || byteLength < 0) return null;
  const offset = byteLength <= 4
    ? entry.valueFieldOffset
    : tiffStart + view.getUint32(entry.valueFieldOffset, littleEndian);
  if (offset < tiffStart || offset + byteLength > end) return null;
  return { offset, byteLength };
}

function readUnsigned(
  entry: IfdEntry | undefined,
  view: DataView,
  tiffStart: number,
  end: number,
  littleEndian: boolean,
): number | null {
  if (!entry || entry.count < 1) return null;
  const data = entryDataOffset(entry, view, tiffStart, end, littleEndian);
  if (!data) return null;
  if (entry.type === 3) return view.getUint16(data.offset, littleEndian);
  if (entry.type === 4) return view.getUint32(data.offset, littleEndian);
  return null;
}

function readAscii(
  entry: IfdEntry | undefined,
  view: DataView,
  tiffStart: number,
  end: number,
  littleEndian: boolean,
): string | null {
  if (!entry || entry.type !== 2 || entry.count < 1) return null;
  const data = entryDataOffset(entry, view, tiffStart, end, littleEndian);
  if (!data) return null;
  const bytes = new Uint8Array(view.buffer, view.byteOffset + data.offset, data.byteLength);
  const value = new TextDecoder("ascii").decode(bytes).replace(/\0+$/, "").trim();
  return value || null;
}

function readRationals(
  entry: IfdEntry | undefined,
  view: DataView,
  tiffStart: number,
  end: number,
  littleEndian: boolean,
): number[] | null {
  if (!entry || entry.type !== 5 || entry.count < 3) return null;
  const data = entryDataOffset(entry, view, tiffStart, end, littleEndian);
  if (!data) return null;
  const result: number[] = [];
  for (let index = 0; index < Math.min(entry.count, 3); index += 1) {
    const offset = data.offset + index * 8;
    const numerator = view.getUint32(offset, littleEndian);
    const denominator = view.getUint32(offset + 4, littleEndian);
    if (!denominator) return null;
    result.push(numerator / denominator);
  }
  return result;
}

function gpsCoordinate(parts: number[] | null, reference: string | null | undefined, limit: number): number | null {
  if (!parts || parts.length < 3) return null;
  const sign = reference === "S" || reference === "W" ? -1 : 1;
  const value = sign * (parts[0] + parts[1] / 60 + parts[2] / 3600);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

function exifDate(value: string | null): string | null {
  const match = value?.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) return null;
  return `${year}-${month}-${day}`;
}

function localDate(timestamp: number): string | null {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasExifSignature(bytes: Uint8Array, offset: number): boolean {
  return offset + 6 <= bytes.length
    && bytes[offset] === 0x45
    && bytes[offset + 1] === 0x78
    && bytes[offset + 2] === 0x69
    && bytes[offset + 3] === 0x66
    && bytes[offset + 4] === 0
    && bytes[offset + 5] === 0;
}
