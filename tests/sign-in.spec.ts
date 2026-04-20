import { expect, test } from '@playwright/test';

import { user1 } from '../jest/mockTestData';
import { disconnectPlaywrightDb, resetDatabase } from './playwright-db';

const nonExistentUserEmail = 'noneuser@testdomain.com';

test.beforeEach(async ({ page }) => {
    await resetDatabase();

    await page.goto('http://localhost:3001/user/sign-in');
});

test.afterAll(async () => {
    await disconnectPlaywrightDb();
});

test('sign-in page displays correctly', async ({ page }) => {
    await expect(page.getByRole('heading')).toContainText(
        'Sign in to your account'
    );
    await expect(
        page.getByRole('textbox', { name: 'Email address' })
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'There was a problem' })
    ).not.toBeVisible();
    await expect(
        page.getByText('Resolve the errors and try')
    ).not.toBeVisible();
    await expect(page.locator('#emailErrorMessage')).not.toBeVisible();
    await expect(page.locator('#passwordErrorMessage')).not.toBeVisible();
    await expect(page.locator('#signinForm')).toMatchAriaSnapshot(`
    - text: Email address
    - textbox "Email address"
    - text: Password
    - textbox "Password"
    - button "Show password"
    - button "Sign in"
    `);
});

test('error shown when user does not enter credentials', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
        page.getByRole('heading', { name: 'There was a problem' })
    ).toBeVisible();
    await expect(page.getByText('Resolve the errors and try')).toBeVisible();
    await expect(page.locator('#emailErrorMessage')).toBeVisible();
    await expect(page.locator('#passwordErrorMessage')).toBeVisible();
    await expect(page.getByText('Error: Enter your email')).toBeVisible();
    await expect(page.getByText('Error: Enter your password')).toBeVisible();
});

test('error shown when user enters non-existent email and no password', async ({
    page,
}) => {
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page
        .getByRole('textbox', { name: 'Email address' })
        .fill(nonExistentUserEmail);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
        page.getByRole('heading', { name: 'There was a problem' })
    ).toBeVisible();
    await expect(
        page.getByText('Enter your password', { exact: true })
    ).toBeVisible();
    await expect(page.locator('#emailErrorMessage')).not.toBeVisible();
    await expect(page.locator('#passwordErrorMessage')).toBeVisible();
    await expect(page.getByText('Error: Enter your password')).toBeVisible();
});

test('error shown when user enters valid email and no password', async ({
    page,
}) => {
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page
        .getByRole('textbox', { name: 'Email address' })
        .fill(user1.email);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
        page.getByRole('heading', { name: 'There was a problem' })
    ).toBeVisible();
    await expect(
        page.getByText('Enter your password', { exact: true })
    ).toBeVisible();
    await expect(page.locator('#emailErrorMessage')).not.toBeVisible();
    await expect(page.locator('#passwordErrorMessage')).toBeVisible();
    await expect(page.getByText('Error: Enter your password')).toBeVisible();
});

test('error shown when user enters valid email and bad password', async ({
    page,
}) => {
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page
        .getByRole('textbox', { name: 'Email address' })
        .fill(user1.email);
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
        page.getByRole('heading', { name: 'There was a problem' })
    ).toBeVisible();
    await expect(
        page.getByText('Your email address and password do not match.', {
            exact: true,
        })
    ).toBeVisible();
    await expect(page.locator('#emailErrorMessage')).toBeVisible();
    await expect(page.locator('#passwordErrorMessage')).toBeVisible();
});
