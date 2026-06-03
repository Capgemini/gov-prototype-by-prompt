import { expect, test } from '@playwright/test';
import 'dotenv/config';

import { prototypeData1, user1 } from '../jest/mockTestData';
import { disconnectPlaywrightDb, resetDatabase } from './playwright-db';

test.beforeEach(async ({ page }) => {
    await resetDatabase();

    const response = await page.request.post(
        'http://localhost:3001/user/sign-in',
        {
            data: {
                email: user1.email,
                password: 'password123',
            },
        }
    );
    expect(response.status()).toBe(204);

    await page.goto('http://localhost:3001/create');
});

test('create page displays correctly', async ({ page }) => {
    await expect(
        page.getByRole('heading', { name: 'Create a prototype' })
    ).toBeVisible();
    await expect(page.getByLabel('Choose a workspace')).toHaveValue(
        user1.personalWorkspaceId
    );
    await page
        .getByRole('textbox', { name: 'Describe the form or service' })
        .click();
    await page
        .getByRole('textbox', { name: 'Describe the form or service' })
        .fill(
            'Create a driving licence application form. Ask for name, email, date of birth, preferred contact methods, automatic or manual, and to explain any health problems. Must be a UK resident and over 17 years old.'
        );
    await expect(page.getByRole('radio', { name: 'GOV.UK' })).toBeChecked();
});

test('can create a prototype and is redirected to the prototype page', async ({
    page,
}) => {
    await page
        .getByRole('textbox', { name: 'Describe the form or service' })
        .click();
    await page
        .getByRole('textbox', { name: 'Describe the form or service' })
        .fill('prompt text');
    await page.getByRole('button', { name: 'Create prototype' }).click();

    await page.waitForURL('http://localhost:3001/prototype/*');

    expect(await page.title()).toContain(prototypeData1.json.title);
});

test.afterAll(async () => {
    await disconnectPlaywrightDb();
});
