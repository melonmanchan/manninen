const fetch = require('node-fetch')
const { promisify } = require('util')
const { IncomingWebhook } = require('@slack/client')
const redis = require('redis')
const cheerio = require('cheerio')
const ILTALEHTI_URL = 'https://www.is.fi/haku/?query=Tuomas%20Manninen'

const client = redis.createClient()
const existsAsync = promisify(client.exists).bind(client)
const setAsync = promisify(client.set).bind(client)

const url = process.env.SLACK_WEBHOOK_URL
const webhook = new IncomingWebhook(url)

async function main() {
  const page = await fetch(ILTALEHTI_URL)
  const text = await page.text()
  const $ = cheerio.load(text)

  searchResults = $('.search-result > .block-link')

  const list = searchResults
    .map(function(index, element) {
      return `https://www.is.fi${$(element).attr('href')}`
    })
    .get()

  list.forEach(async link => {
    const reply = await existsAsync(link)

    if (!reply) {
      console.log(`Persisting link ${link}`)
      client.set(link, 1)

      webhook.send(link, function(err, res) {
        if (err) {
          console.log('Error:', err)
        } else {
          console.log('Message sent: ', res)
        }
      })
    }
  })
}

setInterval(main, 1000)
