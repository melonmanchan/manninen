const fetch = require('node-fetch')
const cheerio = require('cheerio')
const ILTALEHTI_URL = 'https://www.is.fi/haku/?query=Tuomas%20Manninen'

async function main() {
  const page = await fetch(ILTALEHTI_URL)
  const text = await page.text()
  const $ = cheerio.load(text)

  searchResults = $('.search-result > .block-link')

  const list = searchResults
    .map(function(index, element) {
      return `https://www.is.fi/${$(element).attr('href')}`
    })
    .get()

  console.dir(list)
}

main()
// setInterval(main, 5000)
