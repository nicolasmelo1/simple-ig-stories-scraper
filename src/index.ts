import instagram from "./instagram";
import express, { Request, Response } from "express";


async function main() {
  const app = express();

  app.get("/get-stories", async (_: Request, res: Response) => {
    //const client = await instagram("casamentovivianeenicolas", "Vini12!@#");
    const client = await instagram("norcpops", "Nicolas123!@#");

    //await client.followTheUsersBack();
    const stories = await client.extractStories();
    res.json(stories);   
  });

  app.listen(3000, () => {
    console.log("Server started at http://localhost:3000");
  });
}
main();
