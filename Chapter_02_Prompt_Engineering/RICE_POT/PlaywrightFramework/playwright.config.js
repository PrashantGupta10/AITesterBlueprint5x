const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: ['valid-login.spec.js', 'invalid-login.spec.js'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
  use: {
    baseURL: process.env.VWO_BASE_URL || 'https://app.wingify.com',
    browserName: 'chromium',
    channel: 'chrome',
    headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
