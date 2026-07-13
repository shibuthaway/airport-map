const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[PAGE ERROR] ${error.message}`);
  });

  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('Page loaded.');
    await new Promise(r => setTimeout(r, 2000)); // wait for 2 more seconds
  } catch (e) {
    console.log('Navigation failed:', e.message);
  }

  if (errors.length > 0) {
    console.log('Errors caught:');
    errors.forEach(e => console.log(e));
  } else {
    console.log('No errors caught!');
  }

  await browser.close();
  process.exit(0);
})();
