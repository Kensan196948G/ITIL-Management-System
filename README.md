# ITIL Management System

ITILプロセス準拠のインシデント・サービスリクエスト・変更管理システム

## 機能概要

| モジュール | 機能 | 状態 |
|---|---|---|
| インシデント管理 | 7状態ワークフロー、SLA管理、優先度マトリクス、検索フィルター | ✅ 実装済み |
| サービスリクエスト管理 | 承認ワークフロー、カタログ管理、FulfillmentTask | ✅ 実装済み |
| 変更管理 | 9状態ワークフロー、CAB投票、リスク評価、変更スケジュールカレンダー | ✅ 実装済み |
| 問題管理 | 状態ワークフロー、既知のエラー管理、インシデント関連付け | ✅ 実装済み |
| 通知システム | カテゴリ別通知、未読バッジ、一括既読 | ✅ 実装済み |
| SLAポリシー管理 | 優先度別応答/解決時間設定、期限超過検知 | ✅ 実装済み |
| ダッシュボード | KPI指標、統計サマリー、CSVエクスポート | ✅ 実装済み |
| ユーザー・監査 | ユーザー管理、ロール制御、監査ログ | ✅ 実装済み |

## アーキテクチャ

```
┌──────────────────────────────────────────────────┐
│  Frontend (React 18 + TypeScript + Vite)          │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Incidents │ │ServiceRequest│ │ChangeRequest │  │
│  └──────────┘ └──────────────┘ └──────────────┘  │
│         React Query + Zustand + Tailwind CSS      │
└────────────────────┬─────────────────────────────┘
                     │ REST API (axios)
┌────────────────────▼─────────────────────────────┐
│  Backend (FastAPI + Python 3.11+)                 │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │/incidents│ │/service-req..│ │/change-req...│  │
│  └──────────┘ └──────────────┘ └──────────────┘  │
│     /dashboard/summary   /auth   /users          │
│     SQLAlchemy 2.0 (async) + Alembic             │
└────────────────────┬─────────────────────────────┘
                     │ asyncpg
┌────────────────────▼─────────────────────────────┐
│  PostgreSQL 15+                                   │
└──────────────────────────────────────────────────┘
```

## 技術スタック

### バックエンド

| 技術 | バージョン | 用途 |
|---|---|---|
| Python | 3.11+ | 実行環境 |
| FastAPI | 0.110+ | Webフレームワーク |
| SQLAlchemy | 2.0 | ORM（非同期） |
| Alembic | - | DBマイグレーション |
| Pydantic | v2 | スキーマバリデーション |
| python-jose | - | JWT認証 |
| passlib (bcrypt) | - | パスワードハッシュ |
| pytest + pytest-asyncio | - | テスト |

### フロントエンド

| 技術 | バージョン | 用途 |
|---|---|---|
| React | 18 | UIフレームワーク |
| TypeScript | 5.x | 型安全な開発 |
| Vite | 5.x | ビルドツール |
| React Router | v6 | ルーティング |
| React Query (@tanstack/react-query) | - | サーバー状態管理 |
| Zustand | - | クライアント状態管理 |
| Tailwind CSS | - | スタイリング |
| Axios | - | HTTPクライアント |

## セットアップ

### 前提条件

- Docker Compose
- Node.js 20+
- Python 3.11+

### 開発環境の起動

```bash
# PostgreSQLの起動
cd backend
docker compose up -d

# バックエンドのセットアップ
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# フロントエンドのセットアップ
cd frontend
npm install
npm run dev
```

### アクセス先

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:5173 |
| バックエンド API | http://localhost:8000 |
| API ドキュメント (Swagger) | http://localhost:8000/docs |

### 本番デプロイ構成

本番環境ではリバースプロキシ（nginx等）を使用し、フロントエンドとバックエンドを同一オリジンで提供します。

```
ユーザー → nginx (:80/443) ─┬─ /          → フロントエンド静的ファイル
                             └─ /api/v1/* → バックエンド uvicorn (:8000)
```

#### 環境変数

| 変数 | 説明 | デフォルト値 |
|---|---|---|
| `VITE_API_BASE_URL` | フロントエンドAPIベースURL | `/api/v1` |
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgresql+asyncpg://...` |
| `SECRET_KEY` | JWT署名用秘密鍵 | (必須) |
| `CORS_ORIGINS` | 許可するCORSオリジン | `["*"]` |

#### nginx設定例

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/itil/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 本番ビルド

```bash
# バックエンド
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000

# フロントエンド
cd frontend
npm ci
VITE_API_BASE_URL=/api/v1 npm run build
# → dist/ をnginxのルートディレクトリに配置
```

## テスト

### バックエンドテスト

```bash
cd backend
pytest tests/ -v
```

現在: **358テスト** 全件パス (バックエンド) + **188テスト** 全件パス (フロントエンド)

### フロントエンドビルド

```bash
cd frontend
npm run build
```

## APIエンドポイント

### 認証

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/v1/auth/login` | ログイン（JWTトークン発行） |
| PUT | `/api/v1/auth/me` | プロフィール更新 |
| POST | `/api/v1/auth/refresh` | トークン更新 |

### インシデント管理

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/incidents` | 一覧（フィルタ・ページネーション） |
| POST | `/api/v1/incidents` | 作成 |
| GET | `/api/v1/incidents/{id}` | 詳細（ステータスログ含む） |
| PUT | `/api/v1/incidents/{id}` | 更新 |
| POST | `/api/v1/incidents/{id}/transition` | ステータス遷移 |
| GET | `/api/v1/incidents/{id}/transitions` | 許可された遷移一覧 |

### サービスリクエスト管理

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/service-requests` | 一覧 |
| POST | `/api/v1/service-requests` | 作成 |
| GET | `/api/v1/service-requests/{id}` | 詳細 |
| POST | `/api/v1/service-requests/{id}/approve` | 承認 |
| POST | `/api/v1/service-requests/{id}/reject` | 却下 |
| POST | `/api/v1/service-requests/{id}/transition` | ステータス遷移 |

### 変更管理

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/change-requests` | 一覧 |
| POST | `/api/v1/change-requests` | RFC作成 |
| GET | `/api/v1/change-requests/{id}` | 詳細 |
| POST | `/api/v1/change-requests/{id}/approve` | CAB承認 |
| POST | `/api/v1/change-requests/{id}/reject` | 却下 |
| POST | `/api/v1/change-requests/{id}/transition` | ステータス遷移 |
| GET | `/api/v1/change-requests/{id}/transitions` | 許可された遷移一覧 |

### ダッシュボード

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/dashboard/summary` | 3モジュールの統計サマリー |
| GET | `/api/v1/dashboard/kpis` | KPI指標 (MTTR, SLA違反率, 変更成功率, 問題数) |

### 問題管理

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/problems` | 一覧（フィルタ・ページネーション） |
| POST | `/api/v1/problems` | 作成 |
| GET | `/api/v1/problems/{id}` | 詳細（関連インシデント含む） |
| PUT | `/api/v1/problems/{id}` | 更新 |
| POST | `/api/v1/problems/{id}/transition` | ステータス遷移 |
| POST | `/api/v1/problems/{id}/link-incident` | インシデント関連付け |
| DELETE | `/api/v1/problems/{id}/unlink-incident/{incident_id}` | 関連付け解除 |

### 通知

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/notifications` | 一覧（未読/カテゴリフィルタ可） |
| PATCH | `/api/v1/notifications/read` | 指定通知を既読に |
| PATCH | `/api/v1/notifications/read-all` | 全通知を既読に |
| DELETE | `/api/v1/notifications/{id}` | 通知削除 |

### SLAポリシー

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/sla-policies` | 一覧（優先度順） |
| POST | `/api/v1/sla-policies` | 作成（管理者専用） |
| GET | `/api/v1/sla-policies/{priority}` | 優先度別取得 |
| PUT | `/api/v1/sla-policies/{priority}` | 更新（管理者専用） |
| DELETE | `/api/v1/sla-policies/{priority}` | 削除（管理者専用） |

### レポート

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/reports/incidents` | インシデントCSVエクスポート |
| GET | `/api/v1/reports/service-requests` | サービスリクエストCSVエクスポート |
| GET | `/api/v1/reports/change-requests` | 変更リクエストCSVエクスポート |

### ユーザー・監査

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/v1/users` | ユーザー一覧（管理者専用） |
| GET | `/api/v1/users/{id}` | ユーザー詳細（管理者専用） |
| PUT | `/api/v1/users/{id}` | ユーザー更新（管理者専用） |
| GET | `/api/v1/audit-logs` | 監査ログ一覧（管理者専用） |

## 状態ワークフロー

### インシデント管理 (7状態)

```
NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                      ↓
                   PENDING → IN_PROGRESS (再開)
          ↓
       CANCELLED
```

### サービスリクエスト管理 (7状態)

```
SUBMITTED → PENDING_APPROVAL → APPROVED → IN_PROGRESS → COMPLETED
                  ↓                ↓              ↓
              REJECTED         CANCELLED      CANCELLED
```

### 変更管理 (9状態)

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → IN_PROGRESS → COMPLETED
   ↓         ↓            ↓            ↓             ↓
 CANCELLED CANCELLED  REJECTED     CANCELLED      FAILED/CANCELLED
```

### 問題管理 (5状態)

```
NEW → UNDER_INVESTIGATION → ROOT_CAUSE_IDENTIFIED → RESOLVED → CLOSED
  ↓                          ↓
CANCELLED                 KNOWN_ERROR (is_known_error=true)
```

## テスト実績

| 層 | テスト数 | 状態 |
|---|---|---|
| バックエンド (pytest) | 358 | ✅ 全件パス |
| フロントエンド (vitest) | 188 | ✅ 全件パス |
| ESLint | 0 warnings | ✅ |
| TypeScript type-check | 0 errors | ✅ |
| CI (GitHub Actions) | 全ジョブ | ✅ |

## プロジェクトロードマップ

### 月次計画

| 月 | 期間 | フェーズ | 主な活動 |
|---|---|---|---|
| Month 1 | 4/27-5/26 | 基盤整備 | 全20タスク実装完了 ✅ |
| Month 2 | 5/27-6/26 | 品質向上 | E2Eテスト追加、エラーハンドリング強化、パフォーマンス最適化 |
| Month 3 | 6/27-7/26 | テスト整備 | 統合テスト拡充、カバレッジ90%目標、負荷テスト |
| Month 4 | 7/27-8/26 | 安定化 | セキュリティ監査、バグ修正、運用監視基盤 |
| Month 5 | 8/27-9/26 | 統合テスト | 全モジュール結合テスト、リグレッションスイート |
| Month 6 | 9/27-10/27 | リリース準備 | 本番環境構築、移行手順、CHANGELOG、タグ付け |

### 縮退ルール

- 残30日以内: Improvement縮退、Verify/リリース準備を優先
- 残14日以内: 新機能開発禁止、バグ修正・安定化のみ
- 残7日以内: リリース準備のみ（CHANGELOG・README・タグ付け）

### 現在のステータス

- 現在: Month 1 (4日経過) | タスク: 20/20完了 ✅ | テスト: 358(backend) + 188(frontend) = 546件 | STABLE ✅

## プロジェクト期間

- 登録日: 2026-04-27
- リリース期限: 2026-10-27（6ヶ月）
- 現在の進捗: 100% (20/20タスク完了) 🎉
- バックエンドテスト: 358件全件パス
- フロントエンドテスト: 188件全件パス
- CI/CD: GitHub Actions (backend-test / frontend-test / docker-build)
