const fetch = require('node-fetch')
const { promisify } = require('util')
const { IncomingWebhook } = require('@slack/client')
const redis = require('redis')
const cheerio = require('cheerio')
const ILTALEHTI_URL = 'https://www.is.fi/haku/?query=Tuomas%20Manninen'

const client = redis.createClient(process.env.REDIS_URL)
const existsAsync = promisify(client.exists).bind(client)
const setAsync = promisify(client.set).bind(client)

const url = process.env.SLACK_WEBHOOK_URL
const webhook = new IncomingWebhook(url)

async function main() {
  const page = await fetch(ILTALEHTI_URL)
  const text = await page.text()
  const $ = cheerio.load(text)

  const links = $('.search-result > .block-link')
    .map(function(_index, element) {
      return `https://www.is.fi${$(element).attr('href')}`
    })
    .get()

  const titles = $('.search-result .title')
    .map(function(_index, element) {
      return $(element).text()
    })
    .get()

  const posts = links.map((l, i) => {
    return {
      link: l,
      text: titles[i]
    }
  })

  posts.forEach(async post => {
    const reply = await existsAsync(post.link)

    if (!reply) {
      console.log(`Persisting link ${post.link}`)
      client.set(post.link, 1)

      webhook.send(`${post.text} - ${post.link}`, function(err, res) {
        if (err) {
          console.log('Error:', err)
        } else {
          console.log('Message sent: ', res)
        }
      })
    }
  })
}

setInterval(main, 60000)
