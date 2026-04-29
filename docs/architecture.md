# ITIL Management System — システムアーキテクチャ文書

> 最終更新: 2026-04-29 | バージョン: 0.1.0

---

## 1. システム概要

本システムは **ITIL 4 フレームワーク** に準拠したサービス管理プラットフォームであり、インシデント管理・サービスリクエスト管理・変更管理・問題管理・SLA 管理の5つのITIL プラクティスを統合的に実現する。

### アーキテクチャ全体像

```
┌─────────────────────────────────────────────────────────────┐
│                       ユーザー (ブラウザ)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    フロントエンド層                            │
│  React 18 + TypeScript + Vite + Tailwind CSS                │
│  React Router v6 / React Query 5 / Zustand                  │
│  Axios (JWT 自動リフレッシュインターセプター)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    バックエンド層 (API)                        │
│  FastAPI 0.110 + Uvicorn (ASGI)                             │
│  JWT 認証 (アクセス/リフレッシュトークン)                        │
│  Service Layer Pattern (ビジネスロジック分離)                   │
│  Pydantic v2 (リクエスト/レスポンスバリデーション)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ asyncpg (非同期ドライバ)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    データ層 (PostgreSQL 15)                    │
│  SQLAlchemy 2.0 (AsyncSession / DeclarativeBase)            │
│  Alembic (マイグレーション管理)                                 │
│  UUID v4 主キー / JSONB / 列挙型                              │
└─────────────────────────────────────────────────────────────┘
```

### 主要数値

| 項目 | 値 |
|---|---|
| API バージョン | `/api/v1` |
| データベーステーブル数 | 19 |
| Alembic マイグレーション数 | 8 |
| フロントエンドページ数 | 21 |
| バックエンドテストファイル数 | 19 |
| フロントエンドテストファイル数 | 14 |

---

## 2. 技術スタック詳細

### 2.1 バックエンド

| カテゴリ | 技術 | バージョン | 用途 |
|---|---|---|---|
| フレームワーク | FastAPI | 0.110+ | REST API フレームワーク |
| ASGI サーバー | Uvicorn | 0.27+ | HTTP/WebSocket サーバー |
| ORM | SQLAlchemy | 2.0+ | 非同期 DB アクセス (AsyncSession) |
| DB ドライバ | asyncpg | 0.29+ | PostgreSQL 非同期ドライバ |
| マイグレーション | Alembic | 1.13+ | スキーマバージョン管理 |
| バリデーション | Pydantic v2 | 2.5+ | リクエスト/レスポンススキーマ |
| 認証 | python-jose | 3.3+ | JWT エンコード/デコード |
| パスワード | passlib + bcrypt | 4.0+ | パスワードハッシュ化 |
| 設定管理 | pydantic-settings | 2.1+ | 環境変数からの設定読み込み |

### 2.2 フロントエンド

| カテゴリ | 技術 | バージョン | 用途 |
|---|---|---|---|
| UI ライブラリ | React | 18.2+ | コンポーネントベース UI |
| ビルドツール | Vite | 5.1+ | 開発サーバー・バンドル |
| 型システム | TypeScript | 5.3+ | 静的型チェック |
| スタイリング | Tailwind CSS | 3.4+ | ユーティリティファースト CSS |
| ルーティング | React Router DOM | 6.22+ | クライアントサイドルーティング |
| サーバー状態 | @tanstack/react-query | 5.20+ | API データフェッチ・キャッシュ |
| クライアント状態 | Zustand | 4.5+ | 認証状態管理 (persist ミドルウェア) |
| HTTP クライアント | Axios | 1.6+ | API 通信 (JWT インターセプター) |
| UI プリミティブ | Radix UI | - | ダイアログ/ドロップダウン/トースト |
| アイコン | Lucide React | 0.330+ | SVG アイコン |
| テスト | Vitest + Testing Library | 1.3+ / 14.2+ | 単体・統合テスト |
| CSS ユーティリティ | clsx + tailwind-merge + cva | - | 条件付きクラス合成 |

### 2.3 インフラ・DevOps

| カテゴリ | 技術 | バージョン | 用途 |
|---|---|---|---|
| コンテナ | Docker + Compose | - | 開発環境構築 |
| DB イメージ | PostgreSQL | 15-alpine | 本番互換データベース |
| CI/CD | GitHub Actions | - | 自動テスト・ビルド |
| Python ランタイム | Python | 3.11 | バックエンド実行環境 |
| Node.js ランタイム | Node.js | 20 | フロントエンドビルド環境 |

---

## 3. バックエンドアーキテクチャ

### 3.1 ディレクトリ構造

```
backend/
├── Dockerfile
├── docker-compose.yml         # PostgreSQL + FastAPI 開発環境
├── requirements.txt
├── alembic.ini
├── alembic/
│   ├── env.py                 # 非同期マイグレーション設定
│   └── versions/
│       ├── 001_users_and_roles.py
│       ├── 002_audit_log.py
│       ├── 003_incidents.py
│       ├── 004_service_requests.py
│       ├── 005_change_requests.py
│       ├── 006_notifications.py
│       ├── 007_service_catalog_fulfillment.py
│       └── 008_problems.py
├── app/
│   ├── main.py                # FastAPI アプリケーションエントリポイント
│   ├── core/
│   │   ├── config.py          # 環境変数設定 (Settings / pydantic-settings)
│   │   ├── database.py        # async engine / session factory / Base
│   │   ├── security.py        # JWT 生成/検証 / bcrypt ハッシュ
│   │   ├── dependencies.py    # get_current_user / require_admin / require_agent_or_admin
│   │   ├── errors.py          # カスタム例外 (NotFoundError / ConflictError / ForbiddenError)
│   │   ├── pagination.py      # PaginatedResponse ジェネリックモデル
│   │   ├── response.py        # SuccessResponse ジェネリックモデル
│   │   └── base_service.py    # BaseService[T] (CRUD 抽象クラス)
│   ├── models/
│   │   ├── user.py            # User
│   │   ├── role.py            # Role
│   │   ├── incident.py        # Incident / IncidentStatusLog / SLAPolicy
│   │   ├── service_request.py # ServiceRequest / ServiceRequestStatusLog / ServiceCatalogItem / FulfillmentTask
│   │   ├── change_request.py  # ChangeRequest / ChangeRequestStatusLog / CABVote / ChangeSchedule
│   │   ├── notification.py    # Notification
│   │   ├── audit_log.py       # AuditLog
│   │   └── problem.py         # Problem / ProblemIncident / ProblemStatusLog
│   ├── schemas/               # Pydantic リクエスト/レスポンススキーマ
│   ├── api/v1/                # REST エンドポイント (APIRouter)
│   │   ├── auth.py            # /auth/login, /auth/register, /auth/refresh, /auth/me
│   │   ├── users.py           # /users CRUD
│   │   ├── incidents.py       # /incidents CRUD / status transition / SLA
│   │   ├── service_requests.py
│   │   ├── change_requests.py
│   │   ├── problems.py
│   │   ├── sla_policies.py
│   │   ├── notifications.py
│   │   ├── audit_logs.py
│   │   ├── dashboard.py
│   │   └── reports.py
│   └── services/              # ビジネスロジック層 (Service Layer)
│       ├── incident_service.py
│       ├── incident_workflow.py
│       ├── sla_service.py
│       ├── service_request_service.py
│       ├── service_request_workflow.py
│       ├── change_request_service.py
│       ├── change_request_workflow.py
│       ├── problem_service.py
│       ├── problem_workflow.py
│       ├── notification_service.py
│       └── dashboard_service.py
└── tests/
    ├── conftest.py            # テストフィクスチャ (AsyncClient + テストDB)
    └── test_*.py              # 19 テストファイル
```

### 3.2 FastAPI アプリケーション構造

```python
# app/main.py — エントリポイント
app = FastAPI(
    title="ITIL Management System API",
    version="0.1.0",
    lifespan=lifespan,  # 起動時 DB 接続確認
)

# CORS ミドルウェア (allow_origins: 環境変数より設定)
# カスタム例外ハンドラ (NotFoundError / ConflictError / ForbiddenError)

# ルーター登録
app.include_router(api_router, prefix="/api/v1")

# ヘルスチェックエンドポイント
@app.get("/health") -> {status, database}
```

### 3.3 非同期データベースアーキテクチャ

```python
# app/core/database.py
engine = create_async_engine(
    settings.database_url,       # postgresql+asyncpg://...
    echo=(settings.environment == "development")
)
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False       # コミット後もオブジェクトアクセス可能
)

class Base(DeclarativeBase):
    pass
```

セッションライフサイクル (`get_session`):
1. `async_session_factory()` でセッション生成
2. リクエスト処理 (`yield session`)
3. 成功時 `commit()` / 例外時 `rollback()`
4. `finally` で `close()`

### 3.4 Service Layer パターン

ビジネスロジックは API ルーター層から完全に分離され、`app/services/` に配置される。

**BaseService[T] — `app/core/base_service.py`**

```python
class BaseService(Generic[ModelType]):
    async def get(db, id) -> ModelType          # 1件取得
    async def get_multi(db, page, page_size)     # ページネーション取得
    async def create(db, **kwargs) -> ModelType  # 作成
    async def update(db, obj, **kwargs)          # 更新
    async def delete(db, id) -> bool             # 削除
```

**具象サービスの責務:**
- `IncidentService`: インシデント作成/ステータス遷移/担当者割当/フィルタ検索
- `IncidentWorkflowService`: ステータス遷移バリデーション (状態機械)
- `SLAService`: SLA 期限計算/超過判定/残時間計算
- `ChangeRequestService`: 変更リクエスト CRUD / CAB レビュー管理 / スケジュール管理
- `ChangeRequestWorkflowService`: 変更リクエスト状態遷移バリデーション
- `ProblemService`: 問題管理 CRUD / インシデント紐付け
- `ProblemWorkflowService`: 問題状態遷移 (既知のエラー管理)
- `ServiceRequestService`: サービスリクエスト CRUD / 承認フロー / 履行タスク管理
- `ServiceRequestWorkflowService`: サービスリクエスト状態遷移
- `NotificationService`: 通知作成/既読管理/カテゴリ別集計
- `DashboardService`: ダッシュボード集計データ

### 3.5 Alembic マイグレーション

マイグレーションは非同期エンジンで動作し、本番環境では `alembic upgrade head` で適用する。

| リビジョン | 内容 |
|---|---|
| 001 | `roles` テーブル、`users` テーブル、`ix_users_email` インデックス |
| 002 | `audit_logs` テーブル (JSONB カラム、5つのインデックス) |
| 003 | `incident_status`/`incident_priority` 列挙型、`incidents`/`incident_status_logs`/`sla_policies` テーブル |
| 004 | `service_request_status`/`service_request_category` 列挙型、`service_requests`/`service_request_status_logs` テーブル |
| 005 | `change_request_status`/`change_request_type`/`change_request_risk`/`change_request_priority` 列挙型、`change_requests`/`change_request_status_logs` テーブル |
| 006 | `notification_category`/`notification_priority` 列挙型、`notifications` テーブル (3つの複合インデックス) |
| 007 | `fulfillment_task_status`/`cab_vote_decision` 列挙型、`service_catalog_items`/`fulfillment_tasks`/`cab_votes`/`change_schedules` テーブル |
| 008 | `problem_status`/`problem_priority` 列挙型、`problems`/`problem_incidents`/`problem_status_logs` テーブル |

### 3.6 エラーハンドリング

カスタム例外とグローバルハンドラによる一貫したエラーレスポンス:

| 例外クラス | HTTP ステータス | 用途 |
|---|---|---|
| `NotFoundError(resource, id)` | 404 | リソース未検出 |
| `ConflictError(message)` | 409 | 重複・競合 |
| `ForbiddenError` | 403 | 権限不足 |
| `HTTPException` (FastAPI 標準) | 401 | 未認証 / トークン無効 |

---

## 4. フロントエンドアーキテクチャ

### 4.1 ディレクトリ構造

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts            # Vite 設定 (React プラグイン、パスエイリアス、API プロキシ、Vitest)
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx              # エントリポイント (QueryClient + BrowserRouter)
│   ├── App.tsx               # BrowserRouter ラッパー
│   ├── index.css             # Tailwind ディレクティブ
│   ├── router/
│   │   ├── index.tsx         # AppRouter (公開/保護ルート分岐)
│   │   └── layout-routes.tsx # 認証済みページルート定義 (21ルート)
│   ├── api/                  # API クライアント層
│   │   ├── client.ts         # Axios インスタンス + JWT インターセプター
│   │   ├── auth.ts           # /auth/*
│   │   ├── incidents.ts      # /incidents/* + /sla-policies/*
│   │   ├── service-requests.ts
│   │   ├── change-requests.ts
│   │   ├── problems.ts
│   │   ├── dashboard.ts
│   │   ├── notifications.ts
│   │   └── users.ts
│   ├── hooks/                # React Query ラッパーフック
│   │   ├── use-auth.ts
│   │   ├── use-incidents.ts
│   │   ├── use-service-requests.ts
│   │   ├── use-change-requests.ts
│   │   ├── use-problems.ts
│   │   ├── use-notifications.ts
│   │   ├── use-dashboard.ts
│   │   └── use-users.ts
│   ├── store/
│   │   ├── index.ts          # エクスポートバレル
│   │   └── auth-store.ts     # Zustand + persist (認証状態)
│   ├── types/
│   │   ├── index.ts          # PaginatedResponse 汎用型
│   │   ├── auth.ts
│   │   ├── incident.ts
│   │   ├── service-request.ts
│   │   ├── change-request.ts
│   │   ├── problem.ts
│   │   └── notification.ts
│   ├── components/
│   │   ├── auth/
│   │   │   └── protected-route.tsx   # 認証ガード + ロールガード
│   │   ├── layout/
│   │   │   ├── app-layout.tsx        # サイドバー + ヘッダー + メイン領域
│   │   │   ├── sidebar.tsx           # ナビゲーション
│   │   │   ├── header.tsx            # ユーザー情報 + 通知ベル
│   │   │   └── breadcrumbs.tsx       # パンくずリスト
│   │   ├── incidents/
│   │   │   ├── status-badge.tsx      # ステータスバッジ
│   │   │   └── sla-indicator.tsx     # SLA 残時間インジケーター
│   │   ├── problems/
│   │   │   └── status-badge.tsx
│   │   └── ui/                       # プリミティブ UI (shadcn/ui パターン)
│   │       └── button.tsx
│   ├── pages/
│   │   ├── login.tsx / register.tsx  # 認証ページ
│   │   ├── dashboard/                # ダッシュボード
│   │   ├── incidents/                # 一覧 / 作成 / 詳細
│   │   ├── service-requests/         # 一覧 / 作成 / 詳細 / カタログ
│   │   ├── change-requests/          # 一覧 / 作成 / 詳細 / カレンダー
│   │   ├── problems/                 # 一覧 / 作成 / 詳細
│   │   ├── approvals/               # 承認一覧
│   │   ├── admin/                   # ユーザー管理 / Audit Log / SLA ポリシー
│   │   ├── notifications/           # 通知一覧
│   │   └── profile.tsx             # プロフィール
│   ├── lib/
│   │   └── utils.ts                  # cn() ユーティリティ (clsx + tailwind-merge)
│   └── test/
│       ├── setup.ts                  # @testing-library/jest-dom セットアップ
│       └── *.test.tsx                # Vitest テスト
```

### 4.2 Vite 開発サーバー設定

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // FastAPI バックエンドへ転送
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    pool: 'forks',
  }
})
```

### 4.3 API クライアント — JWT インターセプター

`frontend/src/api/client.ts` — 3層のインターセプター機構:

**リクエストインターセプター:**
- ローカルストレージから `access_token` を取得し `Authorization: Bearer <token>` を付与

**レスポンスインターセプター — トークン自動リフレッシュ:**
1. 401 応答を検出
2. `refresh_token` で `/api/v1/auth/refresh` を呼び出し
3. 新トークンを localStorage および Zustand ストアに保存
4. キューイング機構で同時複数 401 の競合を防止
5. リフレッシュ失敗時は `/login` へリダイレクト

**キューイング方式:**
```typescript
let isRefreshing = false          // リフレッシュ中フラグ
let failedQueue: Array<...> = []  // 待機中リクエストのキュー
// リフレッシュ成功 → 全キュー解決
// リフレッシュ失敗 → 全キュー拒否 → ログイン画面へ
```

### 4.4 状態管理アーキテクチャ

| 状態種別 | 技術 | 永続化 | 用途 |
|---|---|---|---|
| 認証状態 | Zustand + persist | localStorage (`auth-storage`) | ユーザー情報 / トークン / 認証フラグ |
| サーバー状態 | React Query 5 | インメモリキャッシュ (5分 stale) | API データの取得・キャッシュ・再取得 |
| フォーム状態 | 各ページ内 useState | なし | 入力値管理 |

**Zustand Auth Store:**
```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user, accessToken) => void
  clearAuth: () => void
}
```

### 4.5 ルーティング設計

| パス | コンポーネント | 認証 | 備考 |
|---|---|---|---|
| `/login` | `LoginPage` | Guest (認証済みなら `/` へリダイレクト) | |
| `/register` | `RegisterPage` | Guest | |
| `/` | `DashboardPage` | Protected | |
| `/incidents` | `IncidentListPage` | Protected | |
| `/incidents/new` | `CreateIncidentPage` | Protected | |
| `/incidents/:id` | `IncidentDetailPage` | Protected | |
| `/service-requests` | `ServiceRequestListPage` | Protected | |
| `/service-requests/new` | `CreateServiceRequestPage` | Protected | |
| `/service-requests/:id` | `ServiceRequestDetailPage` | Protected | |
| `/change-requests` | `ChangeRequestListPage` | Protected | |
| `/change-requests/new` | `CreateChangeRequestPage` | Protected | |
| `/change-requests/calendar` | `ChangeScheduleCalendarPage` | Protected | |
| `/change-requests/:id` | `ChangeRequestDetailPage` | Protected | |
| `/problems` | `ProblemListPage` | Protected | |
| `/problems/new` | `CreateProblemPage` | Protected | |
| `/problems/:id` | `ProblemDetailPage` | Protected | |
| `/service-catalog` | `ServiceCatalogPage` | Protected | |
| `/approvals/*` | `ApprovalsPage` | Protected | |
| `/admin/users` | `AdminUsersPage` | Protected | 管理者のみ |
| `/admin/audit-logs` | `AuditLogsPage` | Protected | 管理者のみ |
| `/admin/sla-policies` | `AdminSLAPoliciesPage` | Protected | 管理者のみ |
| `/profile` | `ProfilePage` | Protected | |
| `/notifications` | `NotificationsPage` | Protected | |

---

## 5. データベーススキーマ概要

### 5.1 ER 図 (主要テーブル関連)

```
roles ──< users
              │
              ├──< incidents ──< incident_status_logs
              ├──< service_requests ──< service_request_status_logs
              ├──< change_requests ──< change_request_status_logs
              ├──< problems ──< problem_status_logs
              ├──< notifications
              └──> audit_logs

incidents >──< problems (problem_incidents: 多対多)
service_requests >──< service_catalog_items
service_requests ──< fulfillment_tasks
change_requests ──< cab_votes
change_requests ──| change_schedules (1:1)
incidents ──| sla_policies (参照、FK なし)
```

### 5.2 主要テーブル定義

#### **users** — ユーザー

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | ユーザーID (uuid4) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | メールアドレス |
| `hashed_password` | VARCHAR(255) | NOT NULL | bcrypt ハッシュ |
| `full_name` | VARCHAR(255) | NOT NULL | 氏名 |
| `role_id` | UUID | FK → roles.id, NULLABLE | ロール |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | 有効/無効 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now(), ON UPDATE now() | |

#### **roles** — ロール

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | admin / agent / user |
| `description` | TEXT | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

#### **incidents** — インシデント

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `title` | VARCHAR(500) | NOT NULL | 件名 |
| `description` | TEXT | NOT NULL | 詳細 |
| `status` | ENUM `incident_status` | NOT NULL, DEFAULT 'new' | new/assigned/in_progress/pending/resolved/closed/cancelled の7状態 |
| `priority` | ENUM `incident_priority` | NOT NULL, DEFAULT 'p3_medium' | p1_critical/p2_high/p3_medium/p4_low |
| `category` | VARCHAR(100) | NULLABLE | カテゴリ |
| `subcategory` | VARCHAR(100) | NULLABLE | サブカテゴリ |
| `reporter_id` | UUID | FK→users.id | 報告者 |
| `assignee_id` | UUID | FK→users.id | 担当者 |
| `sla_due_at` | TIMESTAMPTZ | NULLABLE | SLA 期限 |
| `resolved_at` | TIMESTAMPTZ | NULLABLE | 解決日時 |
| `closed_at` | TIMESTAMPTZ | NULLABLE | クローズ日時 |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

関連: `incident_status_logs` (ステータス変更履歴), `sla_policies` (優先度別SLA設定)

#### **service_requests** — サービスリクエスト

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `title` | VARCHAR(500) | NOT NULL | |
| `description` | TEXT | NOT NULL | |
| `status` | ENUM `service_request_status` | NOT NULL, DEFAULT 'submitted' | submitted/pending_approval/approved/rejected/in_progress/completed/cancelled |
| `category` | ENUM `service_request_category` | NOT NULL | it_equipment/software_access/network_access/user_account/other |
| `catalog_item_id` | UUID | FK→service_catalog_items.id | カタログ品目 |
| `requester_id` | UUID | FK→users.id | 依頼者 |
| `approver_id` | UUID | FK→users.id | 承認者 |
| `assignee_id` | UUID | FK→users.id | 担当者 |
| `due_date` | TIMESTAMPTZ | NULLABLE | 期限 |
| `approved_at` | TIMESTAMPTZ | NULLABLE | |
| `rejected_at` | TIMESTAMPTZ | NULLABLE | |
| `completed_at` | TIMESTAMPTZ | NULLABLE | |
| `rejection_reason` | TEXT | NULLABLE | |

#### **service_catalog_items** — サービスカタログ

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `name` | VARCHAR(200) | NOT NULL | サービス名 |
| `description` | TEXT | NOT NULL | |
| `category` | ENUM `service_request_category` | NOT NULL | |
| `estimated_days` | INTEGER | NULLABLE | 所要日数目安 |
| `requires_approval` | BOOLEAN | NOT NULL, DEFAULT true | 承認要否 |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | 有効/無効 |

#### **change_requests** — 変更リクエスト

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `title` | VARCHAR(500) | NOT NULL | |
| `description` | TEXT | NOT NULL | |
| `status` | ENUM `change_request_status` | NOT NULL, DEFAULT 'draft' | draft/submitted/under_review/approved/rejected/in_progress/completed/failed/cancelled |
| `change_type` | ENUM `change_request_type` | NOT NULL, DEFAULT 'normal' | standard (事前承認済・低リスク)/normal (CAB審査必要)/emergency (緊急) |
| `risk_level` | ENUM `change_request_risk` | NOT NULL, DEFAULT 'medium' | low/medium/high |
| `priority` | ENUM `change_request_priority` | NOT NULL, DEFAULT 'medium' | low/medium/high/critical |
| `requester_id` | UUID | FK→users.id | 依頼者 |
| `reviewer_id` | UUID | FK→users.id | レビュアー |
| `approver_id` | UUID | FK→users.id | 承認者 |
| `implementer_id` | UUID | FK→users.id | 実装者 |
| `planned_start_at` | TIMESTAMPTZ | NULLABLE | 計画開始日時 |
| `planned_end_at` | TIMESTAMPTZ | NULLABLE | 計画終了日時 |
| `actual_start_at` | TIMESTAMPTZ | NULLABLE | 実績開始日時 |
| `actual_end_at` | TIMESTAMPTZ | NULLABLE | 実績終了日時 |
| `approved_at` | TIMESTAMPTZ | NULLABLE | |
| `rejected_at` | TIMESTAMPTZ | NULLABLE | |
| `completed_at` | TIMESTAMPTZ | NULLABLE | |
| `rejection_reason` | TEXT | NULLABLE | 却下理由 |
| `rollback_plan` | TEXT | NULLABLE | ロールバック計画 |

関連: `cab_votes` (CAB投票), `change_schedules` (変更スケジュール: 1:1)

#### **problems** — 問題

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `title` | VARCHAR(500) | NOT NULL | |
| `description` | TEXT | NOT NULL | |
| `status` | ENUM `problem_status` | NOT NULL, DEFAULT 'open' | open/under_investigation/known_error/resolved/closed |
| `priority` | ENUM `problem_priority` | NOT NULL, DEFAULT 'p3_medium' | p1_critical/p2_high/p3_medium/p4_low |
| `reporter_id` | UUID | FK→users.id | |
| `assignee_id` | UUID | FK→users.id | |
| `root_cause` | TEXT | NULLABLE | 根本原因 |
| `workaround` | TEXT | NULLABLE | 回避策 |
| `is_known_error` | BOOLEAN | DEFAULT false | 既知のエラーフラグ |
| `resolved_at` | TIMESTAMPTZ | NULLABLE | |
| `closed_at` | TIMESTAMPTZ | NULLABLE | |

関連: `problem_incidents` (問題とインシデントの多対多関連)

#### **notifications** — 通知

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | FK→users.id, INDEX | 通知先ユーザー |
| `title` | VARCHAR(500) | NOT NULL | |
| `message` | TEXT | NOT NULL | |
| `category` | ENUM `notification_category` | NOT NULL, INDEX | incident/service_request/change_request/system |
| `priority` | ENUM `notification_priority` | NOT NULL, DEFAULT 'medium' | low/medium/high |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false, INDEX | 既読フラグ |
| `related_id` | VARCHAR(255) | NULLABLE | 関連エンティティID |
| `related_url` | VARCHAR(500) | NULLABLE | 遷移先URL |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

#### **audit_logs** — 監査ログ

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | |
| `table_name` | VARCHAR(255) | NOT NULL, INDEX | 操作対象テーブル |
| `record_id` | VARCHAR(255) | NOT NULL, INDEX | 操作対象レコードID |
| `action` | VARCHAR(50) | NOT NULL, INDEX | CREATE / UPDATE / DELETE |
| `user_id` | UUID | NULLABLE, INDEX | 操作ユーザー |
| `changes` | JSONB | NULLABLE | 変更内容 (差分) |
| `created_at` | TIMESTAMPTZ | NOT NULL, INDEX | |

### 5.3 テーブル一覧 (全19テーブル)

| # | テーブル名 | 用途 | 主キー |
|---|---|---|---|
| 1 | `roles` | ロール定義 | UUID |
| 2 | `users` | ユーザーアカウント | UUID |
| 3 | `incidents` | インシデント | UUID |
| 4 | `incident_status_logs` | インシデント状態変更履歴 | UUID |
| 5 | `sla_policies` | SLA ポリシー (優先度別) | UUID |
| 6 | `service_requests` | サービスリクエスト | UUID |
| 7 | `service_request_status_logs` | サービスリクエスト状態変更履歴 | UUID |
| 8 | `service_catalog_items` | サービスカタログ品目 | UUID |
| 9 | `fulfillment_tasks` | 履行タスク | UUID |
| 10 | `change_requests` | 変更リクエスト | UUID |
| 11 | `change_request_status_logs` | 変更リクエスト状態変更履歴 | UUID |
| 12 | `cab_votes` | CAB 投票記録 | UUID |
| 13 | `change_schedules` | 変更スケジュール | UUID |
| 14 | `problems` | 問題 | UUID |
| 15 | `problem_status_logs` | 問題状態変更履歴 | UUID |
| 16 | `problem_incidents` | 問題-インシデント関連 (多対多) | 複合PK |
| 17 | `notifications` | 通知 | UUID |
| 18 | `audit_logs` | 監査ログ | UUID |
| 19 | `alembic_version` | Alembic バージョン管理 | VARCHAR |

### 5.4 データベース設計の特徴

- **全テーブルで UUID v4 主キー**: 分散システム・マイクロサービス化を見据えた設計。外部公開IDとしても安全。
- **PostgreSQL 列挙型を積極活用**: 各エンティティのステータス・優先度は SQL 列挙型で定義。アプリケーションとDBで一貫した制約。
- **JSONB による監査ログ**: `audit_logs.changes` は JSONB 型でスキーマ変更に強い柔軟な差分記録が可能。
- **多対多関連**: `problem_incidents` テーブルで Problem と Incident の多対多関連を実現。
- **状態変更履歴パターン**: 全主要エンティティで `*_status_logs` テーブルを持ち、状態遷移の追跡可能性を担保。

---

## 6. 認証フロー

### 6.1 認証方式

本システムは **JWT (JSON Web Token)** を用いたステートレス認証を採用する。

| 項目 | 設定値 |
|---|---|
| アクセストークン有効期限 | 30分 (`access_token_expire_minutes`) |
| リフレッシュトークン有効期限 | 7日 (`refresh_token_expire_days`) |
| 署名アルゴリズム | HS256 |
| パスワードハッシュ | bcrypt (passlib) |
| トークンペイロード | `{"sub": "<user.id>", "exp": <expire>}` |

### 6.2 認証フロー図

```
[初回ログイン]
  1. POST /api/v1/auth/login {email, password}
  2. サーバー: bcrypt でパスワード検証 → JWT access_token + refresh_token 発行
  3. クライアント: access_token → localStorage + Zustand
                refresh_token → localStorage
                GET /api/v1/auth/me → ユーザー情報取得 → Zustand 保存
  4. 認証後: Axios リクエストインターセプターが全リクエストに
            Authorization: Bearer <access_token> を付与

[アクセストークン期限切れ]
  1. API が 401 を返す
  2. Axios レスポンスインターセプターが POST /api/v1/auth/refresh を自動実行
  3. 新しい access_token + refresh_token を受信し localStorage/Zustand 更新
  4. キューに保持されていた失敗リクエストを新しいトークンで再試行

[リフレッシュトークン期限切れ]
  1. /api/v1/auth/refresh が 401 を返す
  2. ローカルストレージからトークンクリア
  3. ユーザーを /login へリダイレクト
```

### 6.3 ロールベースアクセス制御 (RBAC)

| ロール | 権限 |
|---|---|
| `admin` | 全機能 (ユーザー管理 / 監査ログ / SLAポリシー管理を含む) |
| `agent` | インシデント割当/ステータス変更、サービスリクエスト処理、変更リクエストレビュー、問題調査 |
| `user` (ロール未割当) | 自分のインシデント作成・参照、サービスリクエスト作成、変更リクエスト作成 |

**実装:**

```python
# app/core/dependencies.py
async def get_current_user(token) -> User:
    # JWT デコード → user_id 取得 → DB 検索 → アクティブチェック

async def require_admin(current_user) -> User:
    # role.name == "admin" を強制

async def require_agent_or_admin(current_user) -> User:
    # role.name in ("admin", "agent") を強制
```

API エンドポイントでは FastAPI の `Depends()` で必要な依存関係を注入:
```python
@router.put("/{incident_id}")
async def update_incident(
    ..., 
    _: User = Depends(require_agent_or_admin),  # agent または admin のみ
): ...

@router.get("/admin/users")
async def list_users(
    ...,
    _: User = Depends(require_admin),  # admin のみ
): ...
```

### 6.4 セキュリティ設定

```python
# app/core/config.py
secret_key: str = "..."  # 本番環境では安全なランダム値に変更必須
algorithm: str = "HS256"
access_token_expire_minutes: int = 30
refresh_token_expire_days: int = 7
```

- パスワードは bcrypt でハッシュ化 (`passlib.context.CryptContext(schemes=["bcrypt"])`)
- パスワードの照合は `pwd_context.verify()` で定数時間比較
- CORS はホワイトリスト方式 (`cors_origins` 設定から動的生成)

---

## 7. Docker Compose 開発環境

### 7.1 構成

```yaml
# backend/docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: itil_user
      POSTGRES_PASSWORD: itil_password
      POSTGRES_DB: itil_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U itil_user -d itil_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://itil_user:itil_password@db:5432/itil_db
      ENVIRONMENT: development
    depends_on:
      db:
        condition: service_healthy  # PostgreSQL の準備が整うまで待機

volumes:
  pgdata:
```

### 7.2 起動方法

```bash
cd backend
docker compose up -d        # PostgreSQL + FastAPI 起動
docker compose exec backend alembic upgrade head  # マイグレーション適用
```

### 7.3 Dockerfile (バックエンド)

```dockerfile
FROM python:3.11-slim-bookworm
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 8. CI/CD パイプライン

### 8.1 GitHub Actions — `.github/workflows/ci.yml`

| ジョブ名 | トリガー | 内容 |
|---|---|---|
| `backend-test` | push/PR (main, develop, feature/**) | Python 3.11 / pip インストール / pytest 実行 / Safety 脆弱性スキャン |
| `frontend-test` | push/PR (main, develop, feature/**) | Node 20 / npm ci / TypeScript 型チェック / ESLint / Vitest / Vite ビルド |
| `docker-build` | push/PR (main, develop) (backend-test 成功後) | Docker イメージビルド検証 |

### 8.2 パイプラインフロー

```
[push to main/develop/feature/**]
        │
        ├──> backend-test (Python 3.11)
        │       ├── pip install -r requirements.txt
        │       ├── pytest tests/ -v --tb=short
        │       └── safety check (脆弱性スキャン、failure 無視)
        │
        ├──> frontend-test (Node 20) [並列実行]
        │       ├── npm ci
        │       ├── npm run type-check (tsc --noEmit)
        │       ├── npm run lint (ESLint)
        │       ├── npm test -- --run (Vitest)
        │       └── npm run build (Vite 本番ビルド)
        │
        └──> docker-build [backend-test 成功後に実行]
                └── docker build -t itil-backend:ci ./backend
```

### 8.3 品質ゲート

本番マージ前に全ジョブの成功が必須:

| チェック項目 | ジョブ |
|---|---|
| 単体テスト全パス | backend-test |
| 依存関係の脆弱性なし (参考) | backend-test (safety) |
| 型チェック成功 (TypeScript) | frontend-test |
| Lint エラー 0 | frontend-test |
| フロントエンドテスト全パス | frontend-test |
| 本番ビルド成功 | frontend-test |
| Docker イメージビルド成功 | docker-build |

---

## 9. 設計原則と制約

### 9.1 アーキテクチャパターン

| 層 | パターン | 説明 |
|---|---|---|
| API 層 | Thin Router | ルーターはルーティングと依存注入のみ。ビジネスロジックは Service 層へ委譲 |
| Service 層 | Service Layer + State Machine | Workflow Service で状態遷移をバリデーション。具象 Service が CRUD を拡張 |
| Data 層 | Repository パターン (BaseService) | ジェネリック CRUD 基底クラス。具象サービスで拡張 |
| Frontend 層 | Feature-based structure | `api/` `hooks/` `pages/` `types/` で責務分離。`components/` はドメイン別 |

### 9.2 制約事項

- **非同期必須**: バックエンドの全 DB アクセスは `async/await` で実装。`AsyncSession` を使用。
- **エンドポイント命名**: RESTful。リソース複数形 (`/incidents`, `/change-requests`)。
- **UUID 露出**: 全公開IDは UUID v4。連番による列挙攻撃を防止。
- **トークン有効期限**: アクセストークン 30分 (セキュリティとUXのバランス)。
- **テスト分離**: テストは実データベースに依存せず、テストフィクスチャで独立実行可能。

### 9.3 将来の拡張ポイント

| 項目 | 現状 | 将来計画 |
|---|---|---|
| WebSocket | 未実装 | リアルタイム通知 / ダッシュボードライブ更新 |
| 全文検索 | ILIKE による簡易検索 | PostgreSQL 全文検索 (tsvector) または Elasticsearch |
| ファイル添付 | 未実装 | インシデント/変更リクエストへのファイル添付 |
| メール通知 | 未実装 | SMTP 連携 / テンプレートメール |
| API ドキュメント | Swagger UI (FastAPI 自動生成) | Redoc 追加 / カスタムドキュメント |
| フロントエンド Docker | 未実装 | Nginx + 静的ファイル配信の Docker イメージ |
| 本番インフラ | Docker Compose (開発用) | Kubernetes / Cloud Run / ECS |
| CI パイプラインテスト | Vitest / Pytest (単体) | E2E テスト (Playwright) 追加 |

---

## 10. 主要設定ファイル一覧

| ファイル | パス | 用途 |
|---|---|---|
| バックエンド設定 | `backend/app/core/config.py` | 環境変数 + デフォルト値 |
| データベース設定 | `backend/app/core/database.py` | async engine / session factory |
| Alembic 設定 | `backend/alembic.ini` + `backend/alembic/env.py` | マイグレーション管理 |
| Docker Compose | `backend/docker-compose.yml` | 開発環境 |
| Dockerfile | `backend/Dockerfile` | バックエンドイメージ |
| Vite 設定 | `frontend/vite.config.ts` | ビルド/プロキシ/テスト設定 |
| TypeScript 設定 | `frontend/tsconfig.json` | 型チェック/パスエイリアス |
| Tailwind 設定 | `frontend/tailwind.config.js` | スタイル設定 |
| CI パイプライン | `.github/workflows/ci.yml` | 自動テスト/ビルド |
| プロジェクト状態 | `state.json` | Goal / KPI 管理 |
| プロジェクト運用 | `CLAUDE.md` | Claude 自律開発ポリシー |

---

## 11. 起動シーケンス (開発環境)

```bash
# 1. バックエンド起動
cd backend
docker compose up -d                    # PostgreSQL + FastAPI
docker compose exec backend alembic upgrade head  # DB マイグレーション

# 2. フロントエンド起動 (別ターミナル)
cd frontend
npm install
npm run dev                             # Vite 開発サーバー (localhost:5173)
                                        # /api/* は Vite プロキシ経由で localhost:8000 へ転送
```

ブラウザで `http://localhost:5173` にアクセスし、ログインまたはユーザー登録から開始する。
