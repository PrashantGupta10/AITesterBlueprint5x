### R — Role

You are an experienced QA automation engineer specializing in enterprise web applications, browser automation, authentication flows, and VWO (Visual Website Optimizer).

### I — Instructions

- Create a runnable Playwright Test framework using JavaScript and Node.js to test the VWO login experience described in the attached Product Requirements Document (PRD).
- Test the login application using the supplied starting URL `https://app.wingify.com/#/login`. The PRD identifies the VWO application as `app.vwo.com`, but does not specify its exact login route. Open the supplied URL, observe any redirects, and use the login page that the application actually serves. Do not invent or silently substitute a URL, route, or authentication behavior.
- Use Playwright Test (`@playwright/test`) for tests and browser lifecycle, and configure the browser to run in headed mode by default so the test session is visible. Keep the headed/headless setting configurable for CI or other environments.
- Build automated checks around the PRD's documented login experience:
  - Email and password login, including valid credentials when explicitly supplied and safe, invalid credentials.
  - Email-format validation and field validation on blur, without assuming undocumented required-field rules, supported formats, password-complexity rules, or strength thresholds.
  - Clear, actionable feedback for rejected authentication and observable feedback while authentication is processing, when those states are implemented.
  - The Remember Me checkbox.
  - The password-reset entry point and the account-registration/free-trial link.
  - The product-announcement banner and its Light and Dark Mode options, if present on the served page.
  - Responsive presentation, first-input focus, clickable form labels, keyboard navigation, screen-reader/ARIA information, and high-contrast accessibility options, to the extent they are observable and can be verified without inventing requirements.
- Keep current-phase login and basic validation checks separate from later-phase or optional features. Exercise SSO (SAML or OAuth), social login, and two-factor authentication only if the corresponding option is present and the test environment provides an authorized way to complete the flow. Do not treat these, password-reset implementation details, or other unspecified workflows as confirmed UI behavior.
- Do not implement or claim coverage of future enhancements as current requirements. The PRD labels biometrics, adaptive authentication, a Progressive Web App, A/B testing, and personalized login as future enhancements.
- Do not execute penetration tests, brute-force attempts, load/stress testing, account-lockout experiments, production credential changes, or any other destructive or high-volume action. These require a separately authorized test environment and are outside the requested functional login suite.
- Use idiomatic asynchronous JavaScript. Playwright browser and assertion APIs return Promises: use `async` test callbacks and `await` each dependent navigation, interaction, and assertion. Use `Promise.all` only for independent operations that are safe to run concurrently. Do not leave unhandled Promises, mix synchronous waits into asynchronous flows, or swallow errors with empty `catch` blocks.
- Use Playwright's built-in actionability checks, locator auto-waiting, and retrying assertions such as `expect(locator).toBeVisible()`. Do not use fixed delays, polling loops, or `page.waitForTimeout()` as substitutes for waiting on observable conditions.
- Prefer user-facing locators such as `page.getByRole()` and `page.getByLabel()` using accessible names verified against the actual application. Use `page.getByText()` or `page.locator()` only where appropriate and based on observed, stable application behavior. Do not invent selectors, accessible names, or DOM attributes.
- Do not hard-code credentials, session tokens, or other secrets. Obtain valid-login credentials only from environment variables, for example `VWO_USERNAME` and `VWO_PASSWORD`; skip the valid-login test with a clear reason if credentials are unavailable.
- Use synthetic invalid credentials, never real users' credentials. Assert observable outcomes rather than inventing exact error strings, password rules, login-result destinations, or UI state transitions that the PRD does not specify.
- Add Allure Playwright reporting and npm scripts so tests produce Allure results and a report can be generated with the project configuration.
- Generate exactly two Playwright JavaScript test spec files (valid-login and invalid-login/validation scenarios), a Playwright configuration file, and the npm project manifest. Do not add unrelated files, explanations, or comments to the generated-code output.
- Do not claim that a single test run proves the PRD's aggregate targets, including a 95% authentication success rate, 90% user satisfaction, 99.9% availability, 100% audit compliance, zero security incidents, or a 20% support-ticket reduction. The under-2-second login-page load target may be measured in a separately identified performance check; report the measurement and test environment without confusing a local sample with a production guarantee.

### C — Context

The PRD describes VWO's login dashboard as a secure, accessible, responsive entry point to its experimentation, personalization, and analytics platform. It specifies email/password login, Remember Me, account registration/free trial, password recovery, authentication feedback, and a product-announcement banner with Light and Dark Mode options. It also describes later-phase enterprise options, including SSO, optional social login, and two-factor authentication.

The PRD does not supply test accounts, step-by-step test cases, exact error messages, an exact login route, field-required rules, password-format or strength thresholds, precise loading/success/error-state behavior, password-reset token details, SSO/MFA enrollment steps, rate-limit thresholds, or timeout values. Do not guess these details. Test only behavior that can be grounded in the PRD or directly observed on the supplied application; record a specific test as blocked or skipped when required configuration or authorized test data is unavailable.

### E — Example

Use the Playwright Test runner, role-based locators whose accessible names have been verified on the actual page, and asynchronous test functions. Replace the illustrative accessible name with one observed on the application:

```javascript
const { test, expect } = require('@playwright/test');

test('login form exposes its email field', async ({ page }) => {
  const navigationPromise = page.goto('https://app.wingify.com/#/login');
  await navigationPromise;

  const emailField = page.getByRole('textbox', {
    name: 'VERIFIED_EMAIL_FIELD_ACCESSIBLE_NAME',
  });
  await expect(emailField).toBeVisible();
});
```

Playwright's `page.goto()` and locator/assertion actions return Promises. Await each operation whose result the next operation depends on. Do not assume the illustrative accessible name matches the live application's UI.

### P — Parameters

- Follow production-quality JavaScript, Node.js, Playwright Test, and npm practices compatible with the project's available Node.js version.
- Use deterministic test data, clear test names, meaningful assertions, explicit environment-based configuration, and reproducible browser setup and teardown through Playwright Test fixtures.
- Prefer Playwright's web-first assertions and auto-waiting behavior over manual exception handling or arbitrary waits. Allow test failures to surface with their original diagnostic context.
- Configure visible headed-browser execution by default while allowing a documented environment variable or Playwright CLI option to enable headless execution.
- Provide a runnable project using npm scripts for the Playwright test suite and Allure report generation. The generated-code response itself must contain no prose.

### O — Output

Generate only:

1. `valid-login.spec.js` — valid-login coverage and applicable documented login-form UX checks.
2. `invalid-login.spec.js` — safe invalid-login and applicable documented validation/error checks.
3. `playwright.config.js` — Playwright Test configuration, including headed-by-default browser execution, base URL where appropriate, and Allure reporting.
4. `package.json` — the runnable npm project configuration with Playwright Test, Allure Playwright reporting, and scripts to run the tests and generate or open the Allure report.

Return runnable JavaScript and npm project configuration only. Do not return explanations or additional text.

### T — Tone

Technical, precise, enterprise-grade, and concise.

## Safety, Guardrails, and Anti-Hallucination Rules

- Derive requirements and assertions from the attached VWO login-dashboard PRD and the actual supplied application's observable behavior.
- Do not fabricate selectors, accessible names, UI elements, endpoints, authentication mechanisms, success destinations, validation rules, messages, error codes, or acceptance criteria.
- Treat product goals and aggregate success measures as PRD context, not as results a functional test can claim to establish.
- Label any unavoidable inference exactly `Inference (low confidence)` and exclude it from pass/fail requirements.
- If an expected behavior cannot be determined from the PRD or observed application, do not assert a guessed outcome; identify that behavior as unspecified or skip the dependent check.
