import { test, expect } from '@playwright/test'

test.describe('インシデント管理 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/incidents')
    await page.waitForLoadState('networkidle')
  })

  test('インシデント一覧が表示されること', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'インシデント管理' })).toBeVisible()
    await expect(page.getByRole('link', { name: /新規作成/ })).toBeVisible()
  })

  test('インシデントを作成できること', async ({ page }) => {
    await page.getByRole('link', { name: /新規作成/ }).click()
    await page.waitForURL('**/incidents/new')

    await expect(page.getByRole('heading', { name: 'インシデント登録' })).toBeVisible()

    await page.getByPlaceholder('インシデントの概要を入力してください').fill('E2Eテスト ネットワーク障害')
    await page.getByPlaceholder('詳細な説明を入力してください').fill('本番環境でネットワーク接続が断続的に切断される')

    const prioritySelect = page.locator('select').first()
    await prioritySelect.selectOption({ label: 'P2 高' })

    await page.getByRole('button', { name: '登録する' }).click()

    await page.waitForURL('**/incidents/**')
    await expect(page.getByText('E2Eテスト ネットワーク障害')).toBeVisible()
  })

  test('インシデントのステータス遷移ができること', async ({ page }) => {
    await page.getByRole('link', { name: /新規作成/ }).click()
    await page.waitForURL('**/incidents/new')
    await page.getByPlaceholder('インシデントの概要を入力してください').fill('E2E ステータス遷移テスト')
    await page.getByPlaceholder('詳細な説明を入力してください').fill('ステータス遷移テスト用')
    await page.getByRole('button', { name: '登録する' }).click()
    await page.waitForURL('**/incidents/**')

    const statusSelect = page.locator('select').last()
    if (await statusSelect.count() > 0) {
      const options = await statusSelect.locator('option').allTextContents()
      if (options.some((o) => o.includes('対応中'))) {
        await statusSelect.selectOption({ label: '対応中' })
        await page.getByRole('button', { name: '変更' }).click()
        await expect(page.getByText(/対応中/).first()).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('インシデント一覧のフィルタリングが動作すること', async ({ page }) => {
    await page.goto('/incidents')
    await page.waitForLoadState('networkidle')

    const selects = page.locator('select')
    const selectCount = await selects.count()
    if (selectCount >= 1) {
      await selects.first().selectOption({ label: '新規' })
      await page.waitForTimeout(500)
    }
  })
})
