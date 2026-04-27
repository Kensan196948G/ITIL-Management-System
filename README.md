# ITIL Management System

ITILプロセス準拠のインシデント・サービスリクエスト・変更管理システム

## 機能概要

| モジュール | 機能 | 状態 |
|---|---|---|
| インシデント管理 | 7状態ワークフロー、SLA管理、優先度マトリクス | ✅ 実装済み |
| サービスリクエスト管理 | 承認ワークフロー、カタログ管理 | ✅ 実装済み |
| 変更管理 | 9状態ワークフロー、CAB承認、リスク評価 | ✅ 実装済み |
| ダッシュボード | 3モジュール統計サマリー | ✅ 実装済み |

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

## テスト

### バックエンドテスト

```bash
cd backend
pytest tests/ -v
```

現在: **220テスト** 全件パス

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
| POST | `/api/v1/auth/register` | ユーザー登録 |

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

## プロジェクト期間

- 登録日: 2026-04-27
- リリース期限: 2026-10-27（6ヶ月）
- 現在の進捗: 25% (5/20タスク完了)
- バックエンドテスト: 220件全件パス
