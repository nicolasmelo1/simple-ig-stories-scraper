import puppeteer, { Page } from "puppeteer";
import { sleep } from "./utils";

const INSTAGRAM_HOST = "https://www.instagram.com/";

export default async function instagram(
  username: string,
  password: string,
  options?: { headless: boolean }
) {
  const [page, browser] = await initialize();
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

  async function extractStories() {
    const extractedStories = new Set();
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
      const buttons = await page.$$("button");

      for (const button of buttons) {
        const ariaLabelOfButton = await page.evaluate(
          (button) => button?.ariaLabel || "",
          button
        );
  
        if (ariaLabelOfButton.startsWith("Story") && ariaLabelOfButton.endsWith("not seen")) {
          console.log("Found a story button", ariaLabelOfButton);
          return button;
        }
      }
    }

    let button = await getStoriesButtons();

    while (extractedStories.size < 5 && button) {
      const extractedStoryOnButton = new Set();
      let resolve: (value: any) => void = () => undefined
      const promise = new Promise((r) => (resolve = r));
      page.on('request', (request) => {
        const url = new URL(request.url());
        const isStoryContent = url.hostname.startsWith('instagram') && url.hostname.endsWith('fna.fbcdn.net') && url.searchParams.size > 10;
        if (!isStoryContent) return;
        if (url.searchParams.has('_nc_sid', 'f657c9') === false) return;
        if (extractedStories.has(url.toString())) return;
        if (extractedStoryOnButton.size >= 1) return resolve(undefined);
        extractedStoryOnButton.add(url.toString());
        console.log('Story content URL:', request.url());
      });
      try {
        await button?.click(); 
      } catch (e) {
        console.error('Could not click on the button', e);
      }
      setTimeout(resolve, 5000);
      await promise;

      extractedStories.add((Array.from(extractedStoryOnButton)[0]));
      const toCloseButtons = await page.$$("svg");

      for (const toCloseButton of toCloseButtons) {
        const valueOfToCloseButton = await page.evaluate(
          (toCloseButton) => toCloseButton.ariaLabel,
          toCloseButton
        );
        if (valueOfToCloseButton === "Close") {
          console.log("Found the close button", valueOfToCloseButton);
          await page.evaluate(
            (toCloseButton) => toCloseButton.parentElement?.parentElement?.click(),
            toCloseButton
          );
          break;
        }
      }

      button = await getStoriesButtons();
    }

    return Array.from(extractedStories);
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

