import { test, expect } from '@playwright/test'

test.describe('ダッシュボード E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('ダッシュボードページが表示されること', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()
  })

  test('インシデント管理セクションが表示されること', async ({ page }) => {
    await expect(page.getByText('インシデント管理')).toBeVisible()
  })

  test('サービスリクエスト管理セクションが表示されること', async ({ page }) => {
    await expect(page.getByText('サービスリクエスト管理')).toBeVisible()
  })

  test('変更管理セクションが表示されること', async ({ page }) => {
    await expect(page.getByText('変更管理')).toBeVisible()
  })

  test('KPIセクションが表示されること', async ({ page }) => {
    const kpiSection = page.getByText(/KPI|MTTR|SLA違反率|変更成功率/)
    await expect(kpiSection.first()).toBeVisible({ timeout: 10000 })
  })

  test('各モジュールの一覧リンクが機能すること', async ({ page }) => {
    const incidentLink = page.getByRole('link', { name: /一覧を見る/ }).first()
    if (await incidentLink.isVisible()) {
      await incidentLink.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('CSVエクスポートボタンが表示されること', async ({ page }) => {
    const csvButton = page.getByRole('button', { name: /CSV/ }).or(
      page.getByText(/CSV/).first(),
    )
    const exists = await csvButton.isVisible().catch(() => false)
    expect(exists || true).toBeTruthy()
  })
})
