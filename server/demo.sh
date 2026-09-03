#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:8080/api"

echo "=== Register users ==="

ALICE_TOKEN=$(curl -sf -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","name":"Alice","password":"secret123"}' | jq -r '.token')
echo "Alice registered"

BOB_TOKEN=$(curl -sf -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","name":"Bob","password":"secret123"}' | jq -r '.token')
echo "Bob registered"

CAROL_TOKEN=$(curl -sf -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"carol@example.com","name":"Carol","password":"secret123"}' | jq -r '.token')
echo "Carol registered"

echo ""
echo "=== Fetch user IDs ==="

ALICE_ID=$(curl -sf $BASE/users/me -H "Authorization: Bearer $ALICE_TOKEN" | jq -r '.id')
BOB_ID=$(curl -sf $BASE/users/me -H "Authorization: Bearer $BOB_TOKEN" | jq -r '.id')
CAROL_ID=$(curl -sf $BASE/users/me -H "Authorization: Bearer $CAROL_TOKEN" | jq -r '.id')

echo "Alice:  $ALICE_ID"
echo "Bob:    $BOB_ID"
echo "Carol:  $CAROL_ID"

echo ""
echo "=== Alice creates group trip-2026 ==="

GROUP_ID=$(curl -sf -X POST $BASE/groups \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"trip-2026","description":"Summer road trip","currency":"USD"}' | jq -r '.id')
echo "Group: $GROUP_ID"

echo ""
echo "=== Invite Bob and Carol ==="

BOB_INVITE_TOKEN=$(curl -sf -X POST $BASE/groups/$GROUP_ID/invitations \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com"}' | jq -r '.token')

CAROL_INVITE_TOKEN=$(curl -sf -X POST $BASE/groups/$GROUP_ID/invitations \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"carol@example.com"}' | jq -r '.token')

echo "Bob accepts invitation..."
curl -sf -X POST $BASE/invitations/$BOB_INVITE_TOKEN/accept \
  -H "Authorization: Bearer $BOB_TOKEN" | jq -r '.message'

echo "Carol accepts invitation..."
curl -sf -X POST $BASE/invitations/$CAROL_INVITE_TOKEN/accept \
  -H "Authorization: Bearer $CAROL_TOKEN" | jq -r '.message'

echo ""
echo "=== Add expenses ==="

# Expense 1: Alice paid $120 for hotel, split equally
echo "Alice paid \$120 for hotel (equal split)..."
curl -sf -X POST $BASE/groups/$GROUP_ID/expenses \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"paid_by_id\": \"$ALICE_ID\",
    \"description\": \"Hotel\",
    \"amount_cents\": 12000,
    \"currency\": \"USD\",
    \"date\": \"2026-09-01T12:00:00Z\",
    \"split_type\": \"equal\",
    \"splits\": [
      {\"user_id\": \"$ALICE_ID\"},
      {\"user_id\": \"$BOB_ID\"},
      {\"user_id\": \"$CAROL_ID\"}
    ]
  }" | jq '{id,description,amount_cents}'

# Expense 2: Bob paid $60 for gas, split equally
echo "Bob paid \$60 for gas (equal split)..."
curl -sf -X POST $BASE/groups/$GROUP_ID/expenses \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"paid_by_id\": \"$BOB_ID\",
    \"description\": \"Gas\",
    \"amount_cents\": 6000,
    \"currency\": \"USD\",
    \"date\": \"2026-09-02T09:00:00Z\",
    \"split_type\": \"equal\",
    \"splits\": [
      {\"user_id\": \"$ALICE_ID\"},
      {\"user_id\": \"$BOB_ID\"},
      {\"user_id\": \"$CAROL_ID\"}
    ]
  }" | jq '{id,description,amount_cents}'

# Expense 3: Carol paid $90 for restaurants, split by exact amounts
echo "Carol paid \$90 for restaurants (exact split: Alice \$40, Bob \$20, Carol \$30)..."
curl -sf -X POST $BASE/groups/$GROUP_ID/expenses \
  -H "Authorization: Bearer $CAROL_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"paid_by_id\": \"$CAROL_ID\",
    \"description\": \"Restaurants\",
    \"amount_cents\": 9000,
    \"currency\": \"USD\",
    \"date\": \"2026-09-02T20:00:00Z\",
    \"split_type\": \"exact\",
    \"splits\": [
      {\"user_id\": \"$ALICE_ID\", \"amount_cents\": 4000},
      {\"user_id\": \"$BOB_ID\",   \"amount_cents\": 2000},
      {\"user_id\": \"$CAROL_ID\", \"amount_cents\": 3000}
    ]
  }" | jq '{id,description,amount_cents}'

echo ""
echo "=== Balances ==="

curl -sf $BASE/groups/$GROUP_ID/balances \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq '.'

echo ""
echo "=== Record suggested settlements ==="

BALANCES=$(curl -sf $BASE/groups/$GROUP_ID/balances \
  -H "Authorization: Bearer $ALICE_TOKEN")

echo "$BALANCES" | jq '.suggested_settlements[] | "\(.from_user_name) pays \(.to_user_name) $\(.amount_cents / 100)"'

# Record each suggested settlement
echo "$BALANCES" | jq -c '.suggested_settlements[]' | while read -r s; do
  FROM=$(echo "$s" | jq -r '.from_user_id')
  TO=$(echo "$s" | jq -r '.to_user_id')
  AMOUNT=$(echo "$s" | jq -r '.amount_cents')
  FROM_NAME=$(echo "$s" | jq -r '.from_user_name')

  # Pick the token for the payer
  if [ "$FROM" = "$ALICE_ID" ]; then PAYER_TOKEN=$ALICE_TOKEN
  elif [ "$FROM" = "$BOB_ID" ]; then PAYER_TOKEN=$BOB_TOKEN
  else PAYER_TOKEN=$CAROL_TOKEN
  fi

  curl -sf -X POST $BASE/groups/$GROUP_ID/settlements \
    -H "Authorization: Bearer $PAYER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{
      \"payer_id\": \"$FROM\",
      \"payee_id\": \"$TO\",
      \"amount_cents\": $AMOUNT,
      \"date\": \"2026-09-03T10:00:00Z\",
      \"note\": \"settled up\"
    }" | jq '{id, amount_cents}' | xargs -I{} echo "$FROM_NAME settled: {}"
done

echo ""
echo "=== Final balances (should all be 0) ==="

curl -sf $BASE/groups/$GROUP_ID/balances \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq '.user_balances[] | "\(.user_name): \(.net_cents) cents"'
