import instagram from "./instagram";
import fs from "fs";

const startBrowserInstanceAndGetStories = async () => {
  const client = instagram("norcpops", "Nicolas123!@#");

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received.');
    (await client).close();
    process.exit();
  });

  const recursivelyGetStories = async (client: Awaited<ReturnType<typeof instagram>>) => {
    try {
      const existsFile = fs.existsSync('stories.json')
      const existingData = existsFile ? JSON.parse(fs.readFileSync('stories.json')?.toString() || '[]') : [];
      const stories = await client.extractStories(existingData);
      console.log('Stories', stories);
      const newStories: Set<string> = new Set([...existingData, ...Array.isArray(stories) ? stories: typeof stories === 'string' ? [stories] : []]);
      fs.writeFileSync('stories.json', JSON.stringify(Array.from(newStories), null, 2));
      setTimeout(() => recursivelyGetStories(client), 2000);
    } catch (e) {
      console.error('Error getting stories', e);
      setTimeout(() => recursivelyGetStories(client), 2000);
    }
  }

  await recursivelyGetStories(await client);
}

startBrowserInstanceAndGetStories();