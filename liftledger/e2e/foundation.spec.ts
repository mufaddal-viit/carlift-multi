import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Role = 'manager' | 'driver' | 'rider' | 'admin';

/** Set LL_SHOTS to a folder to keep screenshots of the main screens for visual review. */
const shots = process.env.LL_SHOTS;
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: path.join(shots, `${test.info().project.name}-${name}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
};

async function signIn(page: Page, role: Role, locale: 'en' | 'ar' = 'en') {
  await page.goto(`/${locale}/login`);
  await page.getByTestId(`demo-${role}`).click();
  await page.waitForURL(new RegExp(`/${locale}/(app|driver|rider|admin)$`));
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

test('a visitor who is not signed in is sent to login', async ({ page }) => {
  await page.goto('/en/app');
  await expect(page).toHaveURL(/\/en\/login$/);
});

test('the bare address leads to the English login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en\/login$/);
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
  // Riders who owe the most are listed first, and choosing one fills in what they owe.
  await dialog.getByLabel('Rider').selectOption({ index: 1 });
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
  await page.goto('/en/app');
  await expect(page).toHaveURL(/\/en\/driver$/);
});

test('signing out returns to login and locks the portal again', async ({ page }) => {
  await signIn(page, 'rider');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/en\/login$/);
  await page.goto('/en/rider');
  await expect(page).toHaveURL(/\/en\/login$/);
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
  await expect(page).toHaveURL(/\/ar\/app$/);
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
  await page.goto('/en/app/payments');
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

test('corrupt saved data does not break the app', async ({ page }) => {
  await page.goto('/en/login');
  await page.evaluate(() => localStorage.setItem('liftledger.db.v1', '{"broken":'));
  await signIn(page, 'manager');
  expect(await collected(page)).toBeGreaterThan(0);
});
