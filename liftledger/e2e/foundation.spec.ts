import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Role = 'manager' | 'driver' | 'passenger' | 'admin';

/** Set LL_SHOTS to a folder to keep screenshots of the main screens for visual review. */
const shots = process.env.LL_SHOTS;
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: path.join(shots, `${test.info().project.name}-${name}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
};

const MAJRA = 'al-majra-transport';

/** The Al Majra demo account for each role (the platform admin has no company and signs in at /admin/login). */
const DEMO_ACCOUNT: Record<Role, string> = { manager: 'u-mgr-majra', driver: 'u-drv-majra-1', passenger: 'u-passenger-majra-1', admin: 'u-admin' };

async function signIn(page: Page, role: Role, locale: 'en' | 'ar' = 'en') {
  await page.goto(role === 'admin' ? `/${locale}/admin/login` : `/${locale}/${MAJRA}/login`);
  await page.getByTestId(`demo-${DEMO_ACCOUNT[role]}`).click();
  await page.getByTestId('login-submit').click();
  await page.waitForURL(new RegExp(`/${locale}/(${MAJRA}/(app|driver|passenger)|admin)$`));
}

async function signInWith(page: Page, identifier: string, password: string, company = MAJRA) {
  await page.goto(`/en/${company}/login`);
  await page.getByTestId('login-identifier').fill(identifier);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

const collected = async (page: Page) => {
  const text = await page.getByTestId('collected-amount').innerText();
  return Number(text.replace(/[^\d-]/g, ''));
};

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.beforeEach(async ({ page }) => {
  // Numbers land on their final value at once, which keeps assertions exact.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('a visitor who is not signed in is sent to the company login', async ({ page }) => {
  await page.goto(`/en/${MAJRA}/app`);
  await expect(page).toHaveURL(`/en/${MAJRA}/login`);
});

test('the bare address and the old login lead to the Al Majra login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(`/en/${MAJRA}/login`);
  await expect(page.getByTestId('login-company')).toHaveText('Al Majra Transport');
  await page.goto('/en/login');
  await expect(page).toHaveURL(`/en/${MAJRA}/login`);
});

test('the login page shows only this company and its own accounts', async ({ page }) => {
  await page.goto(`/en/${MAJRA}/login`);
  await expect(page.getByTestId(`demo-${DEMO_ACCOUNT.manager}`)).toBeVisible();
  await expect(page.getByText('Skyline Commute')).toHaveCount(0);
  await expect(page.getByTestId(`demo-${DEMO_ACCOUNT.admin}`)).toHaveCount(0);
});

test('an unknown company address is not found', async ({ page }) => {
  const response = await page.goto('/en/no-such-company/login');
  expect(response?.status()).toBe(404);
});

test('old registration links forward to the company address', async ({ page }) => {
  await page.goto('/en/register/co-majra');
  await expect(page).toHaveURL(`/en/${MAJRA}/register`);
  await expect(page.getByTestId('register-company')).toHaveText('Al Majra Transport');
});

test('signing in needs the right password', async ({ page }) => {
  await signInWith(page, 'manager@almajra.ae', 'wrong-password');
  await expect(page.getByTestId('login-error')).toHaveText('That email, mobile number or password is not right.');
  await expect(page).toHaveURL(`/en/${MAJRA}/login`);
});

test('an empty form says what is missing instead of submitting', async ({ page }) => {
  await page.goto(`/en/${MAJRA}/login`);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-error')).toHaveText('Enter your email or mobile number and your password.');
});

test("a manager cannot sign in on another company's page", async ({ page }) => {
  await signInWith(page, 'manager@skyline.example', 'demo1234');
  await expect(page.getByTestId('login-error')).toBeVisible();
});

test('each manager lands in their own company and cannot open another', async ({ page }) => {
  await signInWith(page, 'manager@skyline.example', 'demo1234', 'skyline-commute');
  await page.waitForURL('/en/skyline-commute/app');
  await page.getByTestId('account-menu').click();
  await expect(page.getByRole('menu')).toContainText('Skyline Commute');
  const cookie = (await page.context().cookies()).find((c) => c.name === 'll_session');
  expect(cookie?.httpOnly).toBe(true);
  await page.goto(`/en/${MAJRA}/app`);
  await expect(page).toHaveURL('/en/skyline-commute/app');
});

test('a suspended company cannot sign in', async ({ page }) => {
  await signInWith(page, 'manager@palm.example', 'demo1234', 'palm-shuttle');
  await expect(page.getByTestId('login-error')).toContainText('suspended');
});

test('a mobile number in local format signs in too', async ({ page }) => {
  await signInWith(page, '050 100 0001', 'demo1234');
  await page.waitForURL(`/en/${MAJRA}/app`);
});

test('a hand-made session cookie does not open a portal', async ({ page, context, baseURL }) => {
  const forged = encodeURIComponent(JSON.stringify({ userId: 'u-admin', role: 'admin', companyId: null, name: 'Mallory', locale: 'en' }));
  await context.addCookies([{ name: 'll_session', value: forged, url: baseURL! }]);
  await page.goto('/en/admin');
  await expect(page).toHaveURL('/en/admin/login');
});

test('the manager sees a dashboard with money collected', async ({ page }) => {
  await signIn(page, 'manager');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  expect(await collected(page)).toBeGreaterThan(0);
  expect(await noSidewaysScroll(page)).toBe(true);
  await shot(page, 'dashboard-en');
});

test('logging a payment raises the collected total by exactly that amount', async ({ page }) => {
  await signIn(page, 'manager');
  const before = await collected(page);

  await page.getByRole('main').getByRole('button', { name: 'Log payment' }).first().click();
  const dialog = page.getByRole('dialog');
  // Passengers who owe the most are listed first, and choosing one fills in what they owe.
  await dialog.getByLabel('Passenger', { exact: true }).selectOption({ index: 1 });
  const amount = Number(await dialog.getByLabel('Amount (AED)').inputValue());
  expect(amount).toBeGreaterThan(0);
  await shot(page, 'log-payment');
  await dialog.getByRole('button', { name: 'Save payment' }).click();

  await expect(dialog).toBeHidden();
  await expect.poll(() => collected(page)).toBe(before + amount);
});

test('the payment form explains what is wrong instead of saving bad input', async ({ page }) => {
  await signIn(page, 'manager');
  await page.getByRole('main').getByRole('button', { name: 'Log payment' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save payment' }).click();
  await expect(dialog.getByText('Choose who paid.')).toBeVisible();
  await expect(dialog.getByText('Enter a whole amount above zero.')).toBeVisible();
  await expect(dialog).toBeVisible();
});

test('a driver cannot open the manager portal', async ({ page }) => {
  await signIn(page, 'driver');
  await page.goto(`/en/${MAJRA}/app`);
  await expect(page).toHaveURL(`/en/${MAJRA}/driver`);
  // Old addresses from before company URLs still land in the right place.
  await page.goto('/en/app');
  await expect(page).toHaveURL(`/en/${MAJRA}/driver`);
});

test('signing out returns to login and locks the portal again', async ({ page }) => {
  await signIn(page, 'passenger');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(`/en/${MAJRA}/login`);
  await page.goto(`/en/${MAJRA}/passenger`);
  await expect(page).toHaveURL(`/en/${MAJRA}/login`);
});

test('Arabic is right-to-left and translated', async ({ page }) => {
  await signIn(page, 'manager', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('مرحباً بعودتك');
  expect(await collected(page)).toBeGreaterThan(0);
  expect(await noSidewaysScroll(page)).toBe(true);
  await shot(page, 'dashboard-ar');
});

test('the language switch keeps you on the same page', async ({ page }) => {
  await signIn(page, 'manager');
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page).toHaveURL(`/ar/${MAJRA}/app`);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('dark theme follows the device setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await signIn(page, 'manager');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByTestId('collected-amount')).toBeVisible();
  await shot(page, 'dashboard-dark');
});

test('a section that is not built yet says so instead of breaking', async ({ page }) => {
  await signIn(page, 'manager');
  await page.goto(`/en/${MAJRA}/app/payments`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Payments');
  await expect(page.getByText('arrives in the next build')).toBeVisible();
});

test('the design kit and dashboard load without console errors or sideways scroll', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/en/dev/kit');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design kit');
  expect(await noSidewaysScroll(page)).toBe(true);
  await shot(page, 'kit');

  await signIn(page, 'manager');
  await expect(page.getByTestId('collected-amount')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});
