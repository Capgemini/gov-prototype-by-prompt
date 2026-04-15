import { expect, test } from '@playwright/test';

test('login page displays correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/user/sign-in');
    await expect(page.getByRole('heading')).toContainText(
        'Sign in to your account'
    );
    await expect(
        page.getByRole('textbox', { name: 'Email address' })
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('error shown when user does not enter credentials', async ({ page }) => {
    await page.goto('http://localhost:3001/user/sign-in');
    await expect(
        page.getByRole('heading', { name: 'There was a problem' })
    ).not.toBeVisible();
    await expect(
        page.getByText('Resolve the errors and try')
    ).not.toBeVisible();
    await expect(page.getByText('Error: Enter your email')).not.toBeVisible();
    await expect(
        page.getByText('Error: Enter your password')
    ).not.toBeVisible();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
        page.getByRole('heading', { name: 'There was a problem' })
    ).toBeVisible();
    await expect(page.getByText('Resolve the errors and try')).toBeVisible();
    await expect(page.getByText('Error: Enter your email')).toBeVisible();
    await expect(page.getByText('Error: Enter your password')).toBeVisible();
});
