# Kuchenteilen

A Splitwise-like expense-sharing API written in Go.

## Architecture

```
cmd/server/          — entry point, dependency wiring
internal/auth/       — JWT interface + local implementation (swap for Supabase)
internal/domain/     — GORM models (source of truth for schema)
internal/repository/ — database access layer
internal/service/    — business logic (balance calc, split logic, etc.)
internal/handler/    — HTTP handlers (Gin)
migrations/          — reference SQL files (schema auto-applied via GORM on startup)
```

Money is stored as **integer minor units** (cents). Never store derived balances — all balances are calculated from the expense/settlement ledger at query time.

## Quick start (Docker)

```bash
cp .env.example .env          # edit JWT_SECRET at minimum
docker compose up --build
```

The API is available at `http://localhost:8080`.

## Local development

Prerequisites: Go 1.22+, PostgreSQL 15+.

```bash
cp .env.example .env
# edit DATABASE_URL and JWT_SECRET

go mod download
go run ./cmd/server
```

## Running tests

```bash
go test ./...
```

## API Reference

All authenticated endpoints require `Authorization: Bearer <token>`.

Money values are always in **cents** (integer).

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login, receive JWT |
| GET  | `/api/users/me` | Get current user profile |

**Register / Login body:**
```json
{ "email": "alice@example.com", "name": "Alice", "password": "secret123" }
```

**Response:**
```json
{ "token": "<jwt>" }
```

### Groups

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/groups` | Create group |
| GET    | `/api/groups` | List my groups |
| GET    | `/api/groups/:groupId` | Get group |
| PUT    | `/api/groups/:groupId` | Update group (admin) |
| DELETE | `/api/groups/:groupId` | Delete group (admin) |
| GET    | `/api/groups/:groupId/members` | List members |
| DELETE | `/api/groups/:groupId/members/:userId` | Remove member |

**Create group body:**
```json
{ "name": "Weekend Trip", "description": "Berlin 2025", "currency": "EUR" }
```

### Expenses

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/groups/:groupId/expenses` | Add expense |
| GET    | `/api/groups/:groupId/expenses` | List expenses |
| GET    | `/api/groups/:groupId/expenses/:expenseId` | Get expense |
| PUT    | `/api/groups/:groupId/expenses/:expenseId` | Update expense |
| DELETE | `/api/groups/:groupId/expenses/:expenseId` | Delete expense |

**Add expense — equal split:**
```json
{
  "paid_by_id": "<uuid>",
  "description": "Dinner",
  "amount_cents": 9000,
  "currency": "EUR",
  "date": "2025-06-01T20:00:00Z",
  "split_type": "equal",
  "splits": [
    { "user_id": "<alice-uuid>" },
    { "user_id": "<bob-uuid>" },
    { "user_id": "<carol-uuid>" }
  ]
}
```

**Add expense — exact split:**
```json
{
  "paid_by_id": "<uuid>",
  "description": "Hotel",
  "amount_cents": 20000,
  "currency": "EUR",
  "date": "2025-06-01T12:00:00Z",
  "split_type": "exact",
  "splits": [
    { "user_id": "<alice-uuid>", "amount_cents": 10000 },
    { "user_id": "<bob-uuid>",   "amount_cents": 6000  },
    { "user_id": "<carol-uuid>", "amount_cents": 4000  }
  ]
}
```

### Balances

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups/:groupId/balances` | Group balances + suggested settlements |

**Response:**
```json
{
  "user_balances": [
    { "user_id": "...", "user_name": "Alice", "net_cents": 2000 },
    { "user_id": "...", "user_name": "Bob",   "net_cents": -2000 }
  ],
  "suggested_settlements": [
    { "from_user_id": "...", "from_user_name": "Bob",
      "to_user_id": "...",   "to_user_name": "Alice",
      "amount_cents": 2000 }
  ]
}
```

### Settlements

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/groups/:groupId/settlements` | Record a payment |
| GET    | `/api/groups/:groupId/settlements` | List settlements |
| DELETE | `/api/groups/:groupId/settlements/:settlementId` | Delete settlement |

**Record settlement body:**
```json
{
  "payer_id": "<bob-uuid>",
  "payee_id": "<alice-uuid>",
  "amount_cents": 2000,
  "currency": "EUR",
  "date": "2025-06-03T10:00:00Z",
  "note": "Paid back via bank transfer"
}
```

### Invitations

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/groups/:groupId/invitations` | Invite by email |
| GET    | `/api/groups/:groupId/invitations` | List pending invitations |
| DELETE | `/api/groups/:groupId/invitations/:invitationId` | Revoke invitation (admin) |
| POST   | `/api/invitations/:token/accept` | Accept invitation |

**Invite body:**
```json
{ "email": "carol@example.com" }
```

Tokens expire after 7 days.

## Supabase Auth integration

Replace `auth.NewLocalJWT(...)` in `cmd/server/main.go` with an implementation of the `auth.Authenticator` interface that validates Supabase JWTs. The interface is:

```go
type Authenticator interface {
    GenerateToken(ctx context.Context, userID uuid.UUID, email string) (string, error)
    ValidateToken(ctx context.Context, token string) (*Claims, error)
}
```

For Supabase: `ValidateToken` should parse the JWT using the Supabase JWT secret (found in project settings), and `GenerateToken` is not needed (Supabase handles token issuance).

## Authorization rules

- All group-scoped endpoints require group membership.
- Only **admins** can update/delete groups, remove other members, and revoke invitations.
- Any member can invite others, add expenses, and record settlements.
- Settlements can only be deleted by the user who created them.
