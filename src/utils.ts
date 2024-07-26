import type internal from "stream";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export function streamToBlob (stream: internal.Readable, mimeType?: string): Promise<Blob> {
  if (mimeType != null && typeof mimeType !== 'string') {
    throw new Error('Invalid mimetype, expected string.')
  }
  return new Promise((resolve, reject) => {
    const chunks: any[] = []
    stream
      .on('data', (chunk: any) => chunks.push(chunk))
      .once('end', () => {
        const blob = mimeType != null
          ? new Blob(chunks, { type: mimeType })
          : new Blob(chunks)
        resolve(blob)
      })
      .once('error', reject)
  })
}
