import express, { Request, Response } from "express";
import { spawn } from "child_process";
import { offloadToBucketClient } from "./offload-to-bucket";
import cors from "cors";

const browserChild = process.env.NODE_ENV === 'production' ? spawn('node', ['./dist/src/browser.js']) : spawn('pnpm', ['run', 'browser']); 
const bucketChild = process.env.NODE_ENV === 'production' ? spawn('node', ['./dist/src/bucket.js']) : spawn('pnpm', ['run', 'bucket']);

browserChild.stdout.on('data', function (data) {
  console.log(`[browser]:`, data.toString());
});

browserChild.stderr.on('data', function (data) {
  console.log(`[browser]:` + data.toString());
});

bucketChild.stdout.on('data', function (data) {
  console.log(`[bucket]:`, data.toString());
});

bucketChild.stderr.on('data', function (data) {
  console.log(`[bucket]:` + data.toString());
});

async function main() {
  const app = express();

  app.use(cors());
  app.get("/get-stories/:fileName", async (req: Request, res: Response) => {
    const client  = offloadToBucketClient();
    const buffer = await client.getFromBucket(req.params.fileName);
    
    res.send(buffer);
  });

  app.get('/healthcheck', (_: Request, res: Response) => {
    console.log('Healthcheck');
    res.json({ status: 'ok' });
  });

  const port = process.env.NODE_ENV === 'production' ? 3000 : 3001;
  
  const server = app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });

  server.on('close', () => {
    browserChild.kill();
    bucketChild.kill();
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received.');
    server.close();
    browserChild.kill();
    bucketChild.kill();
    process.exit();
  });
}
main();
