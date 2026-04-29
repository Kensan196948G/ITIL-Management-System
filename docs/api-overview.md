# ITIL Management System — API Overview

Base URL: `/api/v1`

---

## 1. 認証方式 (Authentication)

全エンドポイント（`/auth/register`, `/auth/login` を除く）は **JWT Bearer Token** による認証が必要。

```
Authorization: Bearer <access_token>
```

- Access Token 有効期限: 設定値 `access_token_expire_minutes`（デフォルト 30 分）
- Refresh Token 有効期限: 設定値 `refresh_token_expire_days`（デフォルト 7 日）
- Token 発行アルゴリズム: HS256
- パスワードハッシュ: bcrypt

認証フロー:

1. `POST /auth/register` でユーザー登録
2. `POST /auth/login` で access_token + refresh_token を取得
3. 以降のリクエストで `Authorization: Bearer <access_token>` を送信
4. access_token 期限切れ時は `POST /auth/refresh` でリフレッシュ

---

## 2. 共通レスポンス形式 (Common Response Format)

### 成功時（単一リソース）

```json
{
  "data": { ... },
  "message": "success"
}
```

### 成功時（ページネーション）

```json
{
  "items": [ ... ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

### エラー時

```json
{
  "detail": "エラーメッセージ"
}
```

### バリデーションエラー時

```json
{
  "detail": [
    {
      "loc": ["body", "title"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 3. ステータスコード (Status Codes)

| Code | 意味 |
|------|------|
| 200 | 取得成功 |
| 201 | 作成成功 |
| 204 | 削除成功（レスポンスボディなし） |
| 400 | リクエスト不正 |
| 401 | 認証エラー（トークン期限切れ/無効/未送信） |
| 403 | 権限不足 |
| 404 | リソース未検出 |
| 409 | 競合（重複メール/不正な状態遷移 等） |
| 422 | バリデーションエラー |

---

## 4. ページネーション (Pagination)

ページネーション対応エンドポイント（`GET /incidents`, `GET /service-requests`, `GET /change-requests`, `GET /problems`, `GET /notifications`, `GET /audit-logs` 等）で共通のクエリパラメータを使用:

| パラメータ | 型 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `page` | int | 1 | ページ番号（1-indexed） |
| `page_size` | int | 20 | 1ページあたりの件数 |

---

## 5. ロールと権限 (Roles & Permissions)

システムは 3 ロール構成:

| ロール | role.name | 権限概要 |
|--------|-----------|---------|
| **管理者 (Admin)** | `admin` | 全操作権限（ユーザー管理、SLA設定、監査ログ閲覧含む） |
| **エージェント (Agent)** | `agent` | インシデント/サービスリクエスト/変更/問題の操作、割り当て、承認 |
| **一般ユーザー (User)** | （ロール未割当） | 自身のインシデント・サービスリクエストの作成と閲覧 |

権限制御デコレータ:

- `get_current_user`: 認証済み全ユーザー
- `require_agent_or_admin`: `admin` または `agent` ロールが必要
- `require_admin`: `admin` ロールのみ

各エンドポイントの権限要件は、本ドキュメントの各モジュールセクションの「認可」欄に記載。

---

## 6. 状態遷移図 (State Transition Diagrams)

### 6.1 インシデント (Incident)

```
 NEW ──────────────→ ASSIGNED ──────────→ IN_PROGRESS ──────────→ RESOLVED ──→ CLOSED
  │                      │                    │  ↑                    │
  │                      │                    │  │ (reopen)           │
  │                      │                    ↓  │                    │
  ├──────────────────────┼────────────────→ PENDING                  │
  │                      │                    │                       │
  ↓                      ↓                    ↓                       ↓
CANCELLED              CANCELLED           CANCELLED               (no exit)
```

**遷移ルール一覧:**

| from_status | 許可される to_status |
|-------------|---------------------|
| `new` | `assigned`, `in_progress`, `cancelled` |
| `assigned` | `in_progress`, `cancelled` |
| `in_progress` | `pending`, `resolved`, `cancelled` |
| `pending` | `in_progress`, `resolved`, `cancelled` |
| `resolved` | `closed`, `in_progress` (reopen) |
| `closed` | — (terminal) |
| `cancelled` | — (terminal) |

---

### 6.2 サービスリクエスト (Service Request)

```
                ┌──→ APPROVED ──→ IN_PROGRESS ──→ COMPLETED
                │        │              │
SUBMITTED ──→ PENDING_APPROVAL  CANCELLED ← CANCELLED
  │               │    │
  │               ↓    ↓
  │           APPROVED REJECTED
  │                        (terminal)
  ↓
CANCELLED
```

**遷移ルール一覧:**

| from_status | 許可される to_status |
|-------------|---------------------|
| `submitted` | `pending_approval`, `approved` (auto-approval), `cancelled` |
| `pending_approval` | `approved`, `rejected`, `cancelled` |
| `approved` | `in_progress`, `cancelled` |
| `rejected` | — (terminal) |
| `in_progress` | `completed`, `cancelled` |
| `completed` | — (terminal) |
| `cancelled` | — (terminal) |

---

### 6.3 変更リクエスト (Change Request)

```
DRAFT ──→ SUBMITTED ──→ UNDER_REVIEW ──→ APPROVED ──→ IN_PROGRESS ──→ COMPLETED
  │           │               │               │              │
  │           │ (fast-track)   │               │              ↓
  │           └───────────────→ APPROVED        │           FAILED
  │                           │               │           (terminal)
  │                           ↓               ↓
  ↓                        CANCELLED       CANCELLED
CANCELLED
```

> **Note:** `standard` タイプの変更は `UNDER_REVIEW` をスキップして直接 `APPROVED` へ遷移可能（fast-track）。`emergency` タイプも同様。

**遷移ルール一覧:**

| from_status | 許可される to_status |
|-------------|---------------------|
| `draft` | `submitted`, `cancelled` |
| `submitted` | `under_review`, `approved` (fast-track), `cancelled` |
| `under_review` | `approved`, `rejected`, `cancelled` |
| `approved` | `in_progress`, `cancelled` |
| `rejected` | — (terminal) |
| `in_progress` | `completed`, `failed`, `cancelled` |
| `completed` | — (terminal) |
| `failed` | — (terminal) |
| `cancelled` | — (terminal) |

---

### 6.4 問題 (Problem)

```
OPEN ──→ UNDER_INVESTIGATION ──→ KNOWN_ERROR ──→ RESOLVED ──→ CLOSED
                                      │               ↑
                                      └───────────────┘
                                      (KNOWN_ERROR→RESOLVED 可能)
                                  RESOLVED → UNDER_INVESTIGATION (reopen)
```

**遷移ルール一覧:**

| from_status | 許可される to_status |
|-------------|---------------------|
| `open` | `under_investigation` |
| `under_investigation` | `known_error`, `resolved` |
| `known_error` | `resolved` |
| `resolved` | `closed`, `under_investigation` (reopen) |
| `closed` | — (terminal) |

---

## 7. API エンドポイント一覧

### 7.1 Auth（認証）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| POST | `/auth/register` | 認証不要 | 新規ユーザー登録 |
| POST | `/auth/login` | 認証不要 | ログイン（access_token + refresh_token 返却） |
| GET | `/auth/me` | 認証済み | 自身のユーザー情報取得 |
| POST | `/auth/refresh` | 認証不要 | refresh_token によるトークン再発行 |

**POST /auth/register** リクエストボディ:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "Taro Yamada"
}
```

**POST /auth/login** リクエストボディ:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
レスポンス:
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG..."
}
```

**POST /auth/refresh** リクエストボディ:
```json
{
  "refresh_token": "eyJhbG..."
}
```

---

### 7.2 Users（ユーザー管理）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/users/` | `admin` | 全ユーザー一覧 |
| GET | `/users/{user_id}` | `admin` | 特定ユーザー取得 |
| PUT | `/users/{user_id}` | `admin` | ユーザー情報更新 |

---

### 7.3 Incidents（インシデント管理）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| POST | `/incidents` | 認証済み | 新規インシデント作成 |
| GET | `/incidents` | 認証済み | インシデント一覧（フィルタ・ページネーション対応） |
| GET | `/incidents/{id}` | 認証済み | インシデント詳細（監査ログ含む） |
| PUT | `/incidents/{id}` | `agent` 以上 | インシデント更新 |
| POST | `/incidents/{id}/transition` | `agent` 以上 | ステータス遷移 |
| POST | `/incidents/{id}/assign` | `agent` 以上 | 担当者割り当て |
| GET | `/incidents/{id}/sla` | 認証済み | SLA 状況（超過有無・残り時間） |
| GET | `/incidents/{id}/transitions` | 認証済み | 許可された遷移先一覧 |

**GET /incidents フィルタパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `status` | IncidentStatus | ステータスでフィルタ |
| `priority` | IncidentPriority | 優先度でフィルタ |
| `assignee_id` | UUID | 担当者でフィルタ |
| `search` | string | タイトル・説明の部分一致検索 |
| `from_date` | datetime | 作成日の開始 |
| `to_date` | datetime | 作成日の終了 |
| `page` | int | ページ番号（デフォルト 1） |
| `page_size` | int | 1ページあたり件数（デフォルト 20） |

**POST /incidents/{id}/transition** リクエストボディ:
```json
{
  "to_status": "in_progress",
  "comment": "対応開始します"
}
```

**POST /incidents/{id}/assign** リクエストボディ:
```json
{
  "assignee_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 7.4 Service Requests（サービスリクエスト管理）

#### サービスカタログ

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/service-requests/catalog` | 認証済み | サービスカタログ一覧 |
| POST | `/service-requests/catalog` | `agent` 以上 | カタログ項目作成 |
| GET | `/service-requests/catalog/{item_id}` | 認証済み | カタログ項目詳細 |
| PUT | `/service-requests/catalog/{item_id}` | `agent` 以上 | カタログ項目更新 |

#### サービスリクエスト本体

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| POST | `/service-requests` | 認証済み | 新規サービスリクエスト作成 |
| GET | `/service-requests` | 認証済み | 一覧（フィルタ・ページネーション） |
| GET | `/service-requests/{id}` | 認証済み | 詳細（監査ログ含む） |
| PUT | `/service-requests/{id}` | `agent` 以上 | 更新 |
| POST | `/service-requests/{id}/approve` | `agent` 以上 | 承認 |
| POST | `/service-requests/{id}/reject` | `agent` 以上 | 却下 |
| POST | `/service-requests/{id}/transition` | `agent` 以上 | ステータス遷移 |
| GET | `/service-requests/{id}/transitions` | 認証済み | 許可された遷移先一覧 |

#### 履行タスク

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/service-requests/{id}/tasks` | 認証済み | 履行タスク一覧 |
| POST | `/service-requests/{id}/tasks` | `agent` 以上 | 履行タスク作成 |
| PUT | `/service-requests/{id}/tasks/{task_id}` | `agent` 以上 | 履行タスク更新 |

> **Note:** 履行タスクを `completed` に更新すると `completed_at` が自動設定される。

**GET /service-requests フィルタパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `status` | ServiceRequestStatus | ステータスでフィルタ |
| `category` | ServiceRequestCategory | カテゴリでフィルタ |
| `requester_id` | UUID | 依頼者でフィルタ |
| `assignee_id` | UUID | 担当者でフィルタ |
| `page` | int | ページ番号 |
| `page_size` | int | 1ページあたり件数 |

**POST /service-requests/{id}/reject** リクエストボディ:
```json
{
  "reason": "予算超過のため却下"
}
```

---

### 7.5 Change Requests（変更管理）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| POST | `/change-requests` | `agent` 以上 | RFC (Request for Change) 作成 |
| GET | `/change-requests` | 認証済み | 一覧（フィルタ・ページネーション） |
| GET | `/change-requests/{id}` | 認証済み | 詳細（監査ログ含む） |
| PUT | `/change-requests/{id}` | `agent` 以上 | 更新 |
| POST | `/change-requests/{id}/approve` | `agent` 以上 | CAB 承認 |
| POST | `/change-requests/{id}/reject` | `agent` 以上 | 却下 |
| POST | `/change-requests/{id}/transition` | `agent` 以上 | ステータス遷移 |
| GET | `/change-requests/{id}/transitions` | 認証済み | 許可された遷移先一覧 |

#### CAB 投票

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/change-requests/{id}/cab-votes` | 認証済み | CAB 投票一覧 |
| POST | `/change-requests/{id}/cab-votes` | `agent` 以上 | CAB 投票（Upsert, 1ユーザー1票） |

#### 変更スケジュール

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/change-requests/{id}/schedule` | 認証済み | 変更スケジュール取得 |
| POST | `/change-requests/{id}/schedule` | `agent` 以上 | 変更スケジュール作成 |
| PUT | `/change-requests/{id}/schedule` | `agent` 以上 | 変更スケジュール更新 |
| GET | `/change-requests/schedules/calendar` | 認証済み | カレンダー表示（期間フィルタ） |

**GET /change-requests フィルタパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `status` | ChangeRequestStatus | ステータスでフィルタ |
| `change_type` | ChangeRequestType | 変更種別でフィルタ |
| `risk_level` | ChangeRequestRisk | リスクレベルでフィルタ |
| `priority` | ChangeRequestPriority | 優先度でフィルタ |
| `requester_id` | UUID | 依頼者でフィルタ |
| `implementer_id` | UUID | 実装者でフィルタ |
| `page` | int | ページ番号 |
| `page_size` | int | 1ページあたり件数 |

**GET /change-requests/schedules/calendar フィルタパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `from_date` | date | 期間開始日 |
| `to_date` | date | 期間終了日 |

**CAB 投票の意思決定 (CABVoteDecision):**

| 値 | 意味 |
|----|------|
| `approve` | 承認 |
| `reject` | 却下 |
| `abstain` | 棄権 |

---

### 7.6 Problems（問題管理）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| POST | `/problems` | `agent` 以上 | 新規問題作成 |
| GET | `/problems` | 認証済み | 一覧（フィルタ・ページネーション） |
| GET | `/problems/{id}` | 認証済み | 詳細（関連インシデント含む） |
| PUT | `/problems/{id}` | `agent` 以上 | 更新 |
| POST | `/problems/{id}/transition` | `agent` 以上 | ステータス遷移 |
| GET | `/problems/{id}/transitions` | 認証済み | 許可された遷移先一覧 |
| POST | `/problems/{id}/link-incident` | `agent` 以上 | インシデント関連付け |
| DELETE | `/problems/{id}/unlink-incident/{incident_id}` | `agent` 以上 | 関連付け解除 |

**GET /problems フィルタパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `status` | ProblemStatus | ステータスでフィルタ |
| `priority` | ProblemPriority | 優先度でフィルタ |
| `assignee_id` | UUID | 担当者でフィルタ |
| `is_known_error` | bool | 既知のエラーフラグでフィルタ |
| `search` | string | タイトル・説明の部分一致検索 |
| `page` | int | ページ番号 |
| `page_size` | int | 1ページあたり件数 |

---

### 7.7 Notifications（通知）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/notifications` | 認証済み | 通知一覧（フィルタ・ページネーション） |
| PATCH | `/notifications/read` | 認証済み | 指定通知を既読に |
| PATCH | `/notifications/read-all` | 認証済み | 全通知を既読に |
| DELETE | `/notifications/{id}` | 認証済み | 通知削除 |

**GET /notifications フィルタパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `unread_only` | bool | 未読のみ表示 |
| `category` | NotificationCategory | カテゴリでフィルタ |

**通知カテゴリ (NotificationCategory):**

| 値 | 意味 |
|----|------|
| `incident` | インシデント関連 |
| `service_request` | サービスリクエスト関連 |
| `change_request` | 変更リクエスト関連 |
| `system` | システム通知 |

**通知優先度 (NotificationPriority):**

| 値 | 意味 |
|----|------|
| `low` | 低 |
| `medium` | 中 |
| `high` | 高 |

**PATCH /notifications/read** リクエストボディ:
```json
{
  "notification_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

---

### 7.8 SLA Policies（SLA ポリシー）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/sla-policies` | 認証済み | SLA ポリシー一覧（優先度順） |
| POST | `/sla-policies` | `admin` | SLA ポリシー作成 |
| GET | `/sla-policies/{priority}` | 認証済み | 優先度別ポリシー取得 |
| PUT | `/sla-policies/{priority}` | `admin` | SLA ポリシー更新 |
| DELETE | `/sla-policies/{priority}` | `admin` | SLA ポリシー削除 |

SLA ポリシーは IncidentPriority ごとに設定:
- `response_time_minutes`: 初回応答までの目標時間（分）
- `resolution_time_minutes`: 解決までの目標時間（分）
- `is_active`: 有効/無効

---

### 7.9 Dashboard（ダッシュボード）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/dashboard/summary` | 認証済み | ステータス別・優先度別集計 |
| GET | `/dashboard/kpis` | 認証済み | KPI 指標（MTTR, SLA違反率, 変更成功率, 問題数） |

**KPI 指標一覧:**

| KPI | 説明 |
|-----|------|
| MTTR | Mean Time To Resolve（平均解決時間） |
| SLA Violation Rate | SLA 違反率 |
| Change Success Rate | 変更成功率 |
| Open Problems | 未解決問題数 |

---

### 7.10 Audit Logs（監査ログ）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/audit-logs/` | `admin` | 監査ログ一覧（フィルタ・ページネーション） |
| GET | `/audit-logs/{log_id}` | `admin` | 特定監査ログエントリ取得 |

**GET /audit-logs/ フィルタパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `table_name` | string | テーブル名でフィルタ |
| `record_id` | UUID | レコードIDでフィルタ |
| `action` | string | 操作種別でフィルタ（INSERT/UPDATE/DELETE） |
| `user_id` | UUID | 操作ユーザーでフィルタ |
| `page` | int | ページ番号 |
| `page_size` | int | 1ページあたり件数 |

---

### 7.11 Reports（レポート）

| Method | Path | 認可 | 説明 |
|--------|------|------|------|
| GET | `/reports/incidents` | `agent` 以上 | インシデント CSV エクスポート |
| GET | `/reports/service-requests` | `agent` 以上 | サービスリクエスト CSV エクスポート |
| GET | `/reports/change-requests` | `agent` 以上 | 変更リクエスト CSV エクスポート |

レスポンス Content-Type: `text/csv`

> **Note:** 各フィルタパラメータは対応する一覧API（`GET /incidents`, `GET /service-requests`, `GET /change-requests`）と共通。

---

## 8. Enum リファレンス

### IncidentStatus
`new` | `assigned` | `in_progress` | `pending` | `resolved` | `closed` | `cancelled`

### IncidentPriority
`p1_critical` | `p2_high` | `p3_medium` | `p4_low`

### ServiceRequestStatus
`submitted` | `pending_approval` | `approved` | `rejected` | `in_progress` | `completed` | `cancelled`

### ServiceRequestCategory
`it_equipment` | `software_access` | `network_access` | `user_account` | `other`

### FulfillmentTaskStatus
`pending` | `in_progress` | `completed` | `skipped`

### ChangeRequestStatus
`draft` | `submitted` | `under_review` | `approved` | `rejected` | `in_progress` | `completed` | `failed` | `cancelled`

### ChangeRequestType
`standard` | `normal` | `emergency`

### ChangeRequestRisk
`low` | `medium` | `high`

### ChangeRequestPriority
`low` | `medium` | `high` | `critical`

### CABVoteDecision
`approve` | `reject` | `abstain`

### ProblemStatus
`open` | `under_investigation` | `known_error` | `resolved` | `closed`

### ProblemPriority
`p1_critical` | `p2_high` | `p3_medium` | `p4_low`

### NotificationCategory
`incident` | `service_request` | `change_request` | `system`

### NotificationPriority
`low` | `medium` | `high`

---

## 9. データモデル間関連

```
Incident ──(多対1)── User (reporter)
Incident ──(多対1)── User (assignee)
Incident ──(1対多)── IncidentStatusLog

ServiceRequest ──(多対1)── ServiceCatalogItem
ServiceRequest ──(多対1)── User (requester)
ServiceRequest ──(多対1)── User (approver)
ServiceRequest ──(多対1)── User (assignee)
ServiceRequest ──(1対多)── ServiceRequestStatusLog
ServiceRequest ──(1対多)── FulfillmentTask

ChangeRequest ──(多対1)── User (requester)
ChangeRequest ──(多対1)── User (reviewer)
ChangeRequest ──(多対1)── User (approver)
ChangeRequest ──(多対1)── User (implementer)
ChangeRequest ──(1対多)── ChangeRequestStatusLog
ChangeRequest ──(1対多)── CABVote
ChangeRequest ──(1対1)── ChangeSchedule

Problem ──(多対1)── User (reporter)
Problem ──(多対1)── User (assignee)
Problem ──(1対多)── ProblemStatusLog
Problem ──(多対多)── Incident (via problem_incidents)

User ──(多対1)── Role
User ──(1対多)── Notification
```
