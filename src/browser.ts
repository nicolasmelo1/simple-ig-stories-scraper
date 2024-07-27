import instagram from "./instagram";
import loggingBuilder from "./utils";

const logger = loggingBuilder("browser");

const startBrowserInstanceAndGetStories = async () => {
  const client = instagram("casamentovivianeenicolas", "Vini12!@#");
  //const client = instagram("norcpops", "Nicolas123!@#");

  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received.');
    (await client).close();
    process.exit();
  });

  const recursivelyGetStories = async (client: Awaited<ReturnType<typeof instagram>>) => {
    try {
      logger.log('recursively Getting stories');
      await client.followTheUsersBack();
      await client.extractStories([]);
      setTimeout(() => recursivelyGetStories(client), 2000);
    } catch (e) {
      logger.error('recursivelyGetStories', 'Error getting stories', e);
      setTimeout(() => recursivelyGetStories(client), 2000);
    }
  }

  await recursivelyGetStories(await client);
}

startBrowserInstanceAndGetStories();