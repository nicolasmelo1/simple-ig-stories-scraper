import instagram from "./instagram";
import express, { Request, Response } from "express";
import { spawn } from "child_process";


const browserChild = process.env.NODE_ENV === 'production' ? spawn('node', ['./browser.ts']) : spawn('pnpm', ['run', 'browser']); 
const bucketChild = process.env.NODE_ENV === 'production' ? spawn('node', ['./bucket.ts']) : spawn('pnpm', ['run', 'bucket']);

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

  app.get("/get-stories", async (_: Request, res: Response) => {
    //const client = await instagram("casamentovivianeenicolas", "Vini12!@#");
    const client = await instagram("norcpops", "Nicolas123!@#");

    //await client.followTheUsersBack();
    const stories = await client.extractStories();
    await client.close()
    res.json(stories);   
  });

  app.get('/healthcheck', (_: Request, res: Response) => {
    console.log('Healthcheck');
    res.json({ status: 'ok' });
  });

  const server = app.listen(3000, () => {
    console.log("Server started at http://localhost:3000");
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
