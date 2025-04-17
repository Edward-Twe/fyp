import { test } from '@playwright/test';

// Test data
const CREDENTIALS = {
  email: 'Edward',
  password: 'Edward_1988'
};

test.describe.configure({ mode: 'parallel' });  // Enable parallel execution

test('Simulate 100 concurrent logins', async ({ browser }) => {
  const startTime = Date.now();
  const concurrentUsers = 100;
  
  // Create array of 100 login promises
  const loginPromises = Array(concurrentUsers).fill(null).map(async (_, index) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Navigate to login
      await page.goto('https://autosched-chi.vercel.app/login', { 
        waitUntil: 'networkidle',
        timeout: 30_000
      });

      // Step 2: Fill credentials
      await page.fill('input[placeholder="Username"]', CREDENTIALS.email);
      await page.fill('input[placeholder="Password"]', CREDENTIALS.password);

      // Step 3: Submit and wait for navigation
      await Promise.all([
        page.click('button[type="submit"]')
      ]);

      // Step 4: Verify success
      await page.waitForURL('**/', { timeout: 15_000 });

      console.log(`User ${index + 1} logged in successfully`);
    } catch (error) {
      const err = error as Error
      console.error(`User ${index + 1} failed:`, err.message);
    } finally {
      await context.close();
    }
  });

  // Run all logins in parallel
  await Promise.all(loginPromises);
  
  console.log(`Total time: ${Date.now() - startTime}ms`);
});