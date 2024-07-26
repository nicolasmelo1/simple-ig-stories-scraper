import { buffer } from "node:stream/consumers";
import type internal from "stream";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export function streamToBuffer (stream: ReadableStream | internal.Readable, mimeType?: string): Promise<Buffer> {
  return buffer(stream as any);
}
