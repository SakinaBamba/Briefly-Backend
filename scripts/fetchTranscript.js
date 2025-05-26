const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const sharepointUrl = 'YOUR_TRANSCRIPT_LINK_HERE';

  // Login if required (skip if token/cookie is already saved)
  await page.goto('https://login.microsoftonline.com/');
  // Insert email, password, and 2FA automation if needed (or use saved session cookies)

  // Go to the SharePoint transcript link
  await page.goto(sharepointUrl, { waitUntil: 'networkidle2' });

  // Wait for the VTT download link to appear
  await page.waitForSelector('a[href*=".vtt"]'); // Adjust selector based on real page
  const vttUrl = await page.$eval('a[href*=".vtt"]', el => el.href);

  // Download the file
  const transcriptRes = await page.goto(vttUrl);
  const buffer = await transcriptRes.buffer();

  const filePath = path.resolve(__dirname, '../downloads/transcript.vtt');
  fs.writeFileSync(filePath, buffer);

  console.log('Transcript downloaded to:', filePath);
  await browser.close();
})();
