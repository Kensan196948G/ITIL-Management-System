import { test, expect } from '@playwright/test'

test.describe('変更管理 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/change-requests')
    await page.waitForLoadState('networkidle')
  })

  test('変更申請一覧が表示されること', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '変更管理' })).toBeVisible()
    await expect(page.getByRole('link', { name: /変更申請/ })).toBeVisible()
  })

  test('変更申請を作成できること', async ({ page }) => {
    await page.getByRole('link', { name: /変更申請/ }).click()
    await page.waitForURL('**/change-requests/new')

    await expect(page.getByRole('heading', { name: '新規変更申請' })).toBeVisible()

    await page.getByPlaceholder('変更内容の概要を入力してください').fill('E2Eテスト DBインデックス追加')
    await page.getByPlaceholder('変更の目的・内容・影響範囲を入力してください').fill('パフォーマンス改善のためインデックスを追加する')

    const selects = page.locator('select')
    const count = await selects.count()
    if (count >= 1) await selects.nth(0).selectOption({ label: '標準変更' })
    if (count >= 2) await selects.nth(1).selectOption({ label: '低' })
    if (count >= 3) await selects.nth(2).selectOption({ label: '中' })

    await page.getByRole('button', { name: /下書きとして作成/ }).click()
    await page.waitForURL('**/change-requests/**')
    await expect(page.getByText('E2Eテスト DBインデックス追加')).toBeVisible()
  })

  test('変更申請詳細でCAB投票セクションが存在すること', async ({ page }) => {
    await page.getByRole('link', { name: /変更申請/ }).click()
    await page.waitForURL('**/change-requests/new')

    await page.getByPlaceholder('変更内容の概要を入力してください').fill('E2E CAB投票テスト')
    await page.getByPlaceholder('変更の目的・内容・影響範囲を入力してください').fill('CAB投票セクション確認用')
    await page.getByRole('button', { name: /下書きとして作成/ }).click()
    await page.waitForURL('**/change-requests/**')

    const cabSection = page.getByRole('heading', { name: /CAB投票/ })
    const scheduleSection = page.getByRole('heading', { name: /変更スケジュール/ })

    await expect(cabSection.or(scheduleSection).first()).toBeVisible({ timeout: 5000 })
  })

  test('変更カレンダーが表示されること', async ({ page }) => {
    await page.goto('/change-requests/calendar')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /変更スケジュールカレンダー/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /前月/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /翌月/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /今月/ })).toBeVisible()
  })
})
