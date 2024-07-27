import { buffer } from "node:stream/consumers";
import fs from "fs";
import type internal from "stream";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export function streamToBuffer (stream: ReadableStream | internal.Readable): Promise<Buffer> {
  return buffer(stream as any);
}

function logger(
  type: "error" | "info" | "log" | "debug" | "warn",
  name: string,
  ...data: any[]
) {
  if (typeof console[type] === "function")
    console[type](
      `[${new Date().toISOString()} ${type.toUpperCase()}]`,
      ...data,
      "\n",
      "------------------"
    );
  if (process.env.NODE_ENV !== 'production') return;
  const logsFile = 'logs.txt'
  const logFileContent = `[${type}/${name}]  ${new Date().toISOString()} ${type.toUpperCase()} ${data.join(" ")}\n`;
  if (fs.existsSync(logsFile) === false) fs.writeFileSync(logsFile, logFileContent);
  else fs.appendFileSync(logsFile, logFileContent);

  const stats = fs.statSync(logsFile)
  const fileSizeInBytes = stats.size;
  // Convert the file size to megabytes (optional)
  const fileSizeInMegabytes = fileSizeInBytes / (1024*1024);
  if (fileSizeInMegabytes > 100) fs.unlinkSync(logsFile);
}

export default function loggingBuilder(name: string) {
  return {
    log: (...data: any[]) => logger(`log`, name, ...data),
    error: (...data: any[]) => logger("error", name, ...data),
    info: (...data: any[]) => logger("info", name, ...data),
    debug: (...data: any[]) => logger("debug", name, ...data),
    warn: (...data: any[]) => logger("warn", name, ...data),
  };
}
