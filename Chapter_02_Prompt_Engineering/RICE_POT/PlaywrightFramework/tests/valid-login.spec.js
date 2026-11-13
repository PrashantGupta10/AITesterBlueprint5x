const { test, expect } = require('@playwright/test');

const username = process.env.VWO_USERNAME;
const password = process.env.VWO_PASSWORD;

test('valid credentials open the authenticated VWO experience', async ({ page }) => {
  test.skip(
    !username || !password,
    'Set VWO_USERNAME and VWO_PASSWORD to run the valid-login test.',
  );

  await page.goto('/#/login');

  const main = page.getByRole('main', { name: 'Application main content' });
  const emailField = main
    .getByRole('textbox', { name: 'Email address' })
    .filter({ visible: true })
    .first();
  const passwordField = main
    .getByRole('textbox', { name: 'Password' })
    .filter({ visible: true })
    .first();

  await expect(emailField).toBeVisible();
  await emailField.fill(username);
  await passwordField.fill(password);
  await main.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(emailField).toBeHidden({ timeout: 20_000 });
});

test('login form provides remember-me, password recovery, and trial entry points', async ({ page }) => {
  await page.goto('/#/login');

  const main = page.getByRole('main', { name: 'Application main content' });
  const rememberMe = main.getByLabel('Remember me');
  const rememberMeLabel = main
    .getByText('Remember me', { exact: true })
    .filter({ visible: true })
    .first();

  await expect(rememberMeLabel).toBeVisible();
  await rememberMeLabel.click();
  await expect(rememberMe).toBeChecked();
  await rememberMeLabel.click();
  await expect(rememberMe).not.toBeChecked();

  await expect(main.getByRole('link', { name: 'Start a free trial' })).toBeVisible();
  await main.getByRole('button', { name: 'Forgot Password?' }).click();
  await expect(main.getByRole('button', { name: 'Reset Password' })).toBeVisible();
  await expect(main.getByRole('button', { name: 'Back' })).toBeVisible();
});
