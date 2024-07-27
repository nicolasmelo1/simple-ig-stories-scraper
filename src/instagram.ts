import puppeteer, { Page } from "puppeteer";
import loggingBuilder, { sleep } from "./utils";
import { randomUUID } from 'node:crypto';
import fs from 'fs';

const INSTAGRAM_HOST = "https://www.instagram.com/";
const TOTAL_NUMBER_OF_STORIES_PER_RUN = 10;
const logger = loggingBuilder("instagram");

export default async function instagram(
  username: string,
  password: string,
  options?: { headless: boolean }
) {
  let [page, browser] = await initialize();
  await login(page);

  /**
   * Initialize the puppeteer browser instance and keep it running until we finish what needs to be done
   */
  async function initialize() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 900, height: 900 },
    });

    const openedPages = await browser.pages();
    const page = openedPages[0];
    await page.goto(INSTAGRAM_HOST + "accounts/login/");
    await page.waitForNetworkIdle();

    return [page, browser] as const;
  }

  /**
   * Logs the user into Instagram so we can start interacting with the page.
   */
  async function login(page: Page) {
    await page.screenshot({
      path: 'screenshot.jpg'
    });
    await page.type("input[name=username]", username);
    await page.type("input[name=password]", password);

    await page.click("button[type=submit]");

    await sleep(10000);
    logger.log("Logged in");
    
    /*
    /*const handles = await page.$$("a");

    console.log("Found the following handles:");
    await handles[0].click();
    console.log("Clicked on the first handle");
    await page.waitForNetworkIdle();*/
    logger.log("Logged in2");

    const buttons = await page.$$("button");

    for (const button of buttons) {
      const value = await page.evaluate((button) => button.textContent, button);
      if (value === "Not Now") {
        await button.click();
        break;
      }
    }
  }

  async function followTheUsersBack() {
    const page = await browser.newPage();
    await page.goto(INSTAGRAM_HOST + username + "/followers/");
    await page.waitForNetworkIdle();

    const anchorTags = await page.$$("a");
    for (const anchorTag of anchorTags) {
      const valueOfAnchor = await page.evaluate(
        (anchor) => anchor?.textContent || "",
        anchorTag
      );
      logger.log(valueOfAnchor);
      await sleep(Math.random() * 10000)

      if (valueOfAnchor.endsWith('followers')) {
        await anchorTag.click()
        break;
      }
      await sleep(Math.random() * 10000)

    }


    await page.waitForNetworkIdle();
    await sleep(Math.random() * 10000)
    const buttons = await page.$$("button");
    for (const button of buttons) {
      const valueOfButton = await page.evaluate(
        (button) => button?.previousSibling?.textContent || "",
        button
      );

      if (valueOfButton === "·") {
        await sleep(Math.random() * 10000)
        await button.click();
      }
    }
    try {
      await page.close()
    } catch (e) {
      logger.log('Error closing the page', e);
    }
  }

  async function extractStories(existingData: string[] = []) {
    try {
      const extractedStories = new Set<string>();
      const alreadyViewedStories = new Set<string>();
      const page = await browser.newPage();
      
      const pathToUse = Math.random() > 0.3 ? 'direct/inbox/' : Math.random() > 0.3 ? username : 'explore';
      await page.goto(INSTAGRAM_HOST + pathToUse);
      await page.waitForNetworkIdle();
      

      const closeNotNow = async () => {
        let buttons = await page.$$("button");
        logger.log("Found the not now buttons");
        for (const button of buttons) {
          const value = await page.evaluate((button) => button.textContent, button);
          if (value === "Not Now") {
            await button.click();
            break;
          }
        }
      }

      await closeNotNow();

      const anchorTags = await page.$$("a");
      for (const anchorTag of anchorTags) {
        const textContent = await page.evaluate(
          (anchorTag) => anchorTag?.textContent || "",
          anchorTag
        );

        if (textContent.endsWith('Home')) {
          await anchorTag.click();
          await page.waitForNetworkIdle();
          break;
        }
      }

      await closeNotNow();

      const getStoriesButtons = async () => {
        let buttons = await page.$$("button");
        
        await page.screenshot({
          path: 'getting_the_story_button.jpg'
        });

        await sleep(Math.random() * 60000)
        for (const button of buttons) {
          const ariaLabelOfButton = await page.evaluate(
            (button) => button?.ariaLabel || "",
            button
          );
          const textContentOfButton = await page.evaluate(
            (button) => button?.textContent || "",
            button
          );
    
          if (
            ariaLabelOfButton.startsWith("Story") && 
            ariaLabelOfButton.endsWith("not seen") && 
            textContentOfButton.startsWith("LIVE") === false &&
            alreadyViewedStories.has(ariaLabelOfButton) === false
          ) {
            logger.log("Found a story button", ariaLabelOfButton);
            alreadyViewedStories.add(ariaLabelOfButton);
            return button;
          }
        }
      }

      let button = await getStoriesButtons();

      logger.log("Extracting stories");
      while (extractedStories.size < TOTAL_NUMBER_OF_STORIES_PER_RUN && button) {
        logger.log("Extracting stories", extractedStories.size);
        const extractedStoryOnButton = new Set();
        const storyUuid = randomUUID();
        /*let resolve: (value: any) => void = () => undefined
        const promise = new Promise((r) => (resolve = r));
        page.on('request', (request) => {
          const url = new URL(request.url());
          const isStoryContent = url.hostname.startsWith('instagram') && url.hostname.endsWith('fna.fbcdn.net') && url.searchParams.size > 10;
          if (!isStoryContent) return;
          if (extractedStories.has(url.toString())) return;
          if (oldExtractedStories.has(url.toString())) return;
          if (extractedStoryOnButton.size >= 1) return resolve(undefined);
          extractedStoryOnButton.add(url.toString());
          console.log('Story content URL:', request.url());
        });*/
        try {
          await button?.click(); 
        } catch (e) {
          logger.log('Could not click on the button', e);
        }
        //setTimeout(resolve, 5000);
        await sleep(3000);
        fs.existsSync('./stories') || fs.mkdirSync('./stories');
        await page.screenshot({
          path: `./stories/${storyUuid}.jpg`,
          clip: {
            height: 900,
            width: 500,
            y: 0,
            x: 200,
          }
        });
        //await promise;

        extractedStories.add(storyUuid);
        //console.log("Extracted story", Array.from(extractedStoryOnButton)[0]);
        //extractedStories.add(Array.from(extractedStoryOnButton)[0] as string);

        logger.log("Extracted stories", extractedStories.size, TOTAL_NUMBER_OF_STORIES_PER_RUN);
        const toCloseButtons = await page.$$("svg");
        for (const toCloseButton of toCloseButtons) {
          const valueOfToCloseButton = await page.evaluate(
            (toCloseButton) => toCloseButton.ariaLabel,
            toCloseButton
          );
          
          if (valueOfToCloseButton === "Close") {
            await sleep(2000);
            logger.log("Found the close button", valueOfToCloseButton);
            await page.screenshot({
              path: 'closing_the_button.jpg'
            });
            await page.evaluate(
              (toCloseButton) => toCloseButton.parentElement?.parentElement?.click(),
              toCloseButton
            );
            break;
          }
        }
        await sleep(Math.random() * 15000)

        button = await getStoriesButtons();
      }
      await page.close();
      return Array.from(extractedStories).filter((story) => typeof story === 'string');
    } catch (e) {
      logger.log('Error getting stories', e);
      try {
        await browser.close();
      } catch (e) {
        logger.log('Error closing the browser', e);
      }

      const [newPage, newBrowser] = await initialize();
      browser = newBrowser;
      await login(newPage);
      return [];
    }
  }

  async function close() {
    await browser.close();
  }

  return {
    close,
    followTheUsersBack,
    extractStories,
  };
}

