import puppeteer, { Page } from "puppeteer";
import { sleep } from "./utils";
import { randomUUID } from 'node:crypto';
import fs from 'fs';

const INSTAGRAM_HOST = "https://www.instagram.com/";
const TOTAL_NUMBER_OF_STORIES_PER_RUN = 10;
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
    console.log("Logged in");
    
    /*
    /*const handles = await page.$$("a");

    console.log("Found the following handles:");
    await handles[0].click();
    console.log("Clicked on the first handle");
    await page.waitForNetworkIdle();*/
    console.log("Logged in2");

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
      console.log(valueOfAnchor);
      if (valueOfAnchor.endsWith('followers')) {
        await anchorTag.click()
        break;
      }
    }

    await page.waitForNetworkIdle();
    const buttons = await page.$$("button");
    for (const button of buttons) {
      const valueOfButton = await page.evaluate(
        (button) => button?.previousSibling?.textContent || "",
        button
      );

      if (valueOfButton === "·") await button.click();
    }
  }

  async function extractStories(existingData: string[] = []) {
    try {
      const oldExtractedStories = new Set<string>(...existingData);
      const extractedStories = new Set<string>();
      const alreadyViewedStories = new Set<string>();
      const page = await browser.newPage();
      
      await page.goto(INSTAGRAM_HOST);
      await page.waitForNetworkIdle();

      
      let buttons = await page.$$("button");

      for (const button of buttons) {
        const value = await page.evaluate((button) => button.textContent, button);
        if (value === "Not Now") {
          await button.click();
          break;
        }
      }


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
    
          if (ariaLabelOfButton.startsWith("Story") && ariaLabelOfButton.endsWith("not seen") && alreadyViewedStories.has(ariaLabelOfButton) === false) {
            console.log("Found a story button", ariaLabelOfButton);
            alreadyViewedStories.add(ariaLabelOfButton);
            return button;
          }
        }
      }

      let button = await getStoriesButtons();

      while (extractedStories.size < TOTAL_NUMBER_OF_STORIES_PER_RUN && button) {
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
          console.log('Could not click on the button', e);
        }
        //setTimeout(resolve, 5000);
        await page.waitForNetworkIdle({
          idleTime: 2000
        });
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

        const toCloseButtons = await page.$$("svg");
        for (const toCloseButton of toCloseButtons) {
          const valueOfToCloseButton = await page.evaluate(
            (toCloseButton) => toCloseButton.ariaLabel,
            toCloseButton
          );
          
          if (valueOfToCloseButton === "Close") {
            await sleep(2000);
            console.log("Found the close button", valueOfToCloseButton);
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
      console.log('Error getting stories', e);
      try {
        await browser.close();
      } catch (e) {
        console.log('Error closing the browser', e);
      }

      const [newPage, newBrowser] = await initialize();
      browser = newBrowser;
      await login(newPage);
      return extractStories(existingData); 
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

