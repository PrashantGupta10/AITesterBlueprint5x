const { test, expect } = require('@playwright/test');

test('invalid email format displays validation feedback after blur', async ({ page }) => {
  await page.goto('/#/login');

  const main = page.getByRole('main', { name: 'Application main content' });
  const emailField = main
    .getByRole('textbox', { name: 'Email address' })
    .filter({ visible: true })
    .first();

  await expect(emailField).toHaveAttribute('type', 'email');
  await emailField.fill('not-an-email');
  await emailField.blur();

  const hasEmailFormatError = await emailField.evaluate(
    (element) => element.validity.typeMismatch,
  );
  expect(hasEmailFormatError).toBe(true);
});

test('synthetic invalid credentials display login failure feedback', async ({ page }) => {
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

  await emailField.fill('invalid.user@example.invalid');
  await passwordField.fill('InvalidPassword-NotARealSecret-123!');
  await main.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(
    main.getByText(/did not match/i).filter({ visible: true }),
  ).toBeVisible({ timeout: 15_000 });
});
