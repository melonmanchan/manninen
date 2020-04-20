const fetch = require("node-fetch");
const { promisify } = require("util");
const { IncomingWebhook } = require("@slack/client");
const redis = require("redis");
const ILTALEHTI_URL =
  "https://www.is.fi/api/search/Tuomas%20Manninen/kaikki/month/new/0/50";

const client = redis.createClient(process.env.REDIS_URL);
const existsAsync = promisify(client.exists).bind(client);
const setAsync = promisify(client.set).bind(client);

const webhooksUrls = (process.env.SLACK_WEBHOOK_URLS || "").split(",");
const webhooks = webhooksUrls.map((url) => new IncomingWebhook(url));

async function main() {
  const page = await fetch(ILTALEHTI_URL);
  const contents = await page.json();

  await Promise.all([
    contents.map(async (post) => {
      const { id, title, srcUrl } = post;
      const url = `https://is.fi${srcUrl}/art-${id}.html`;
      const reply = await existsAsync(id);

      if (!reply) {
        console.log(`Persisting link ${url}`);
        await setAsync(id, 1);
        webhooks.forEach((w) => {
          w.send(`${title} - ${url}`, function (err, res) {
            if (err) {
              console.log("Error:", err);
            } else {
              console.log("Message sent: ", res);
            }
          });
        });
      }
    }),
  ]);

  console.log("done");

  process.exit(0);
}

main();
