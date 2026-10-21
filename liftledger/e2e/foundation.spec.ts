import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Role = 'manager' | 'driver' | 'passenger' | 'admin';

/** Set LL_SHOTS to a folder to keep screenshots of the main screens for visual review. */
const shots = process.env.LL_SHOTS;
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: path.join(shots, `${test.info().project.name}-${name}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
};

const AMAD = 'amad-express';

/** The Amad Express demo account for each role (the platform admin has no company and signs in at /admin/login). */
const DEMO_ACCOUNT: Record<Role, string> = { manager: 'u-mgr-majra', driver: 'u-drv-majra-1', passenger: 'u-passenger-majra-1', admin: 'u-admin' };

async function signIn(page: Page, role: Role, locale: 'en' | 'ar' = 'en') {
  await page.goto(role === 'admin' ? `/${locale}/admin/login` : `/${locale}/${AMAD}/login`);
  await page.getByTestId(`demo-${DEMO_ACCOUNT[role]}`).click();
  await page.getByTestId('login-submit').click();
  await page.waitForURL(new RegExp(`/${locale}/(${AMAD}/(app|driver|passenger)|admin)$`));
}

async function signInWith(page: Page, identifier: string, password: string, company = AMAD) {
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
  await page.goto(`/en/${AMAD}/app`);
  await expect(page).toHaveURL(`/en/${AMAD}/login`);
});

test('the bare address and the old login lead to the Amad Express login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(`/en/${AMAD}/login`);
  await expect(page.getByTestId('login-company')).toHaveText('Amad Express');
  await page.goto('/en/login');
  await expect(page).toHaveURL(`/en/${AMAD}/login`);
});

test('the login page shows only this company and its own accounts', async ({ page }) => {
  await page.goto(`/en/${AMAD}/login`);
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
  await expect(page).toHaveURL(`/en/${AMAD}/register`);
  await expect(page.getByTestId('register-company')).toHaveText('Amad Express');
});

test('signing in needs the right password', async ({ page }) => {
  await signInWith(page, 'manager@amadexpress.ae', 'wrong-password');
  await expect(page.getByTestId('login-error')).toHaveText('That email, mobile number or password is not right.');
  await expect(page).toHaveURL(`/en/${AMAD}/login`);
});

test('an empty form says what is missing instead of submitting', async ({ page }) => {
  await page.goto(`/en/${AMAD}/login`);
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
  const cookie = (await page.context().cookies()).find((c) => c.name === 'liftledger_session');
  expect(cookie?.httpOnly).toBe(true);
  await page.goto(`/en/${AMAD}/app`);
  await expect(page).toHaveURL('/en/skyline-commute/app');
});

test('a suspended company cannot sign in', async ({ page }) => {
  await signInWith(page, 'manager@palm.example', 'demo1234', 'palm-shuttle');
  await expect(page.getByTestId('login-error')).toContainText('suspended');
});

test('a mobile number in local format signs in too', async ({ page }) => {
  await signInWith(page, '050 100 0001', 'demo1234');
  await page.waitForURL(`/en/${AMAD}/app`);
});

test('a hand-made session cookie does not open a portal', async ({ page, context, baseURL }) => {
  const forged = encodeURIComponent(JSON.stringify({ userId: 'u-admin', role: 'admin', companyId: null, name: 'Mallory', locale: 'en' }));
  await context.addCookies([{ name: 'liftledger_session', value: forged, url: baseURL! }]);
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
  await page.goto(`/en/${AMAD}/app`);
  await expect(page).toHaveURL(`/en/${AMAD}/driver`);
  // Old addresses from before company URLs still land in the right place.
  await page.goto('/en/app');
  await expect(page).toHaveURL(`/en/${AMAD}/driver`);
});

test('signing out returns to login and locks the portal again', async ({ page }) => {
  await signIn(page, 'passenger');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(`/en/${AMAD}/login`);
  await page.goto(`/en/${AMAD}/passenger`);
  await expect(page).toHaveURL(`/en/${AMAD}/login`);
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
  await expect(page).toHaveURL(`/ar/${AMAD}/app`);
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
  await page.goto(`/en/${AMAD}/app/payments`);
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

/** Desktop and phone runs share one database, so each moves its own passengers (all start in car 1, B 12345). */
const mover = () =>
  test.info().project.name === 'phone'
    ? { id: 'pax-majra-4', name: 'Lina Haddad', other: 'pax-majra-5', otherName: 'Omar Farouk' }
    : { id: 'pax-majra-1', name: 'Priya Nair', other: 'pax-majra-2', otherName: 'Rahul Menon' };

test('a manager moves a passenger to another car, and the change shows everywhere', async ({ page }) => {
  const { id, name } = mover();
  await signIn(page, 'manager');
  await page.goto(`/en/${AMAD}/app/passengers`);
  await expect(page.getByTestId(`car-of-${id}`).filter({ visible: true })).toContainText('B 12345');

  await page.getByTestId(`assign-${id}`).filter({ visible: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('car-option-car-majra-1')).toContainText('Current');
  await expect(dialog.getByTestId('assign-save')).toBeDisabled();
  await dialog.getByTestId('car-option-car-majra-3').click();
  await shot(page, 'assign-car');
  await dialog.getByTestId('assign-save').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`${name} now rides in A 44821.`)).toBeVisible();
  await expect(page.getByTestId(`car-of-${id}`).filter({ visible: true })).toContainText('A 44821');

  // The statement shows the new car and the move in its history.
  await page.goto(`/en/${AMAD}/app/passengers/${id}`);
  await expect(page.getByTestId('soa-car')).toContainText('A 44821');
  await expect(page.getByTestId('car-history')).toContainText('Moved from B 12345 to A 44821');
  await expect(page.getByTestId('car-history')).toContainText('by Amad');
});

test('a passenger taken out of their car is listed as waiting until given one', async ({ page }) => {
  const { other: id, otherName: name } = mover();
  await signIn(page, 'manager');
  await page.goto(`/en/${AMAD}/app/passengers/${id}`);
  await page.getByTestId('soa-assign').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByTestId('car-option-none').click();
  await dialog.getByTestId('assign-save').click();
  await expect(page.getByTestId('soa-car')).toHaveText('No car');

  await page.goto(`/en/${AMAD}/app/passengers`);
  await page.getByRole('radio', { name: /Waiting for a car/ }).click();
  await expect(page.getByRole('link', { name }).filter({ visible: true })).toBeVisible();
  await page.getByTestId(`assign-${id}`).filter({ visible: true }).click();
  await page.getByRole('dialog').getByTestId('car-option-car-majra-2').click();
  await page.getByRole('dialog').getByTestId('assign-save').click();
  await expect(page.getByText(`${name} now rides in D 67890.`)).toBeVisible();
  await expect(page.getByRole('link', { name })).toHaveCount(0);
});
