import { test, expect } from '@playwright/test'

test.describe('サービスリクエスト管理 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/service-requests')
    await page.waitForLoadState('networkidle')
  })

  test('サービスリクエスト一覧が表示されること', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'サービスリクエスト管理' })).toBeVisible()
    await expect(page.getByRole('link', { name: /新規リクエスト/ })).toBeVisible()
  })

  test('サービスリクエストを作成できること', async ({ page }) => {
    await page.getByRole('link', { name: /新規リクエスト/ }).click()
    await page.waitForURL('**/service-requests/new')

    await expect(page.getByRole('heading', { name: '新規サービスリクエスト' })).toBeVisible()

    await page.getByPlaceholder('リクエストの概要を入力してください').fill('E2Eテスト PCセットアップ依頼')
    await page.getByPlaceholder('詳細な説明を入力してください').fill('新入社員用ノートPCのセットアップをお願いします')

    const selects = page.locator('select')
    const selectCount = await selects.count()
    if (selectCount >= 1) {
      await selects.first().selectOption({ label: 'IT機器' })
    }

    await page.getByRole('button', { name: '送信する' }).click()
    await page.waitForURL('**/service-requests/**')
    await expect(page.getByText('E2Eテスト PCセットアップ依頼')).toBeVisible()
  })

  test('サービスカタログが表示されること', async ({ page }) => {
    await page.goto('/service-catalog')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'サービスカタログ' })).toBeVisible()
  })

  test('サービスリクエスト詳細が表示されること', async ({ page }) => {
    await page.getByRole('link', { name: /新規リクエスト/ }).click()
    await page.waitForURL('**/service-requests/new')
    await page.getByPlaceholder('リクエストの概要を入力してください').fill('E2E 詳細確認テスト')
    await page.getByPlaceholder('詳細な説明を入力してください').fill('詳細ページの表示確認用')
    await page.getByRole('button', { name: '送信する' }).click()
    await page.waitForURL('**/service-requests/**')

    const approveButton = page.getByRole('button', { name: /承認する/ })
    const rejectButton = page.getByRole('button', { name: /却下する/ })

    await expect(approveButton.or(rejectButton).first()).toBeVisible({ timeout: 5000 })
  })
})
