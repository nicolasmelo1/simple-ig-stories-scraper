import instagram from "./instagram";
import loggingBuilder from "./utils";

const logger = loggingBuilder("browser");

const startBrowserInstanceAndGetStories = async () => {

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
  try {
    const client = instagram("casamentovivianeenicolas", "Vini12!@#");

    process.on('SIGINT', async () => {
      logger.log('SIGINT signal received.');
      (await client).close();
      process.exit();
    });
    await recursivelyGetStories(await Promise.resolve(client));
  } catch (e) {
    logger.error('startBrowserInstanceAndGetStories', 'Error starting browser instance')
    startBrowserInstanceAndGetStories();
  }
}

startBrowserInstanceAndGetStories();