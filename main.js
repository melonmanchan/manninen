const fetch = require("node-fetch");
const { promisify } = require("util");
const { IncomingWebhook } = require("@slack/client");
const redis = require("redis");
const uuid = require("uuid");

const ILTALEHTI_URL =
  "https://www.is.fi/api/search/tuomas%20manninen/kaikki/month/new/0/50/0/1621158953538";

const client = redis.createClient(process.env.REDIS_URL);
const existsAsync = promisify(client.exists).bind(client);
const setAsync = promisify(client.set).bind(client);

const url = process.env.SLACK_WEBHOOK_URLS;
const webhook = url ? new IncomingWebhook(url) : undefined;

const id = uuid.v4();
const log = (msg, ...rest) => console.log(`[id:${id}] ${msg}`, rest);

async function main() {
  const page = await fetch(ILTALEHTI_URL);

  if (!page.ok) {
    log("Err", await page.text());
    return;
  }

  const contents = await page.json();

  for (let i = 0; i < contents.length; i++) {
    const post = contents[i];
    log("Handling post", post);

    const { href, id, title } = post;
    const url = `https://is.fi${href}`;
    const reply = await existsAsync(id);

    if (!reply) {
      log(`Persisting link ${url}`);

      await setAsync(id, 1);

      log("Link persised succesfully");

      const fullTitle = `${title} - ${url}`;

      if (webhook) {
        log(`Sending link ${fullTitle}`);
        await webhook.send(fullTitle);
      } else {
        log(`WARNING: WEBHOOK UNDEFINED`);
      }
    } else {
      log(`Post with id ${id} already exists`);
    }
  }

  console.log("Run done");

  process.exit(0);
}

main();
