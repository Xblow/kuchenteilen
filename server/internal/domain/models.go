package domain

import (
	"time"

	"github.com/google/uuid"
)

type Group struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"not null"                                       json:"name"`
	Description string    `json:"description"`
	Currency    string    `gorm:"not null;default:'USD'"                         json:"currency"`
	Currencies  []string  `gorm:"serializer:json"                                json:"currencies"`
	AccessToken string    `gorm:"uniqueIndex;not null"                           json:"access_token"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Participant struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID   uuid.UUID `gorm:"type:uuid;not null;index"                       json:"group_id"`
	Name      string    `gorm:"not null"                                       json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// Expense is one entry in the append-only log.
// RecordID is the stable logical identity. Multiple Expense rows share the same RecordID.
// The "current" state of a record is the row with the latest CreatedAt for that RecordID.
// A tombstone (deleted record) has AmountCents=0 and no Splits.
type Expense struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	RecordID    uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"record_id"`
	GroupID     uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"group_id"`
	PaidByID    uuid.UUID      `gorm:"type:uuid;not null"                             json:"paid_by_id"`
	Description string         `gorm:"not null"                                       json:"description"`
	AmountCents int64          `gorm:"not null"                                       json:"amount_cents"`
	Currency    string         `gorm:"not null;default:'USD'"                         json:"currency"`
	Date        time.Time      `gorm:"not null"                                       json:"date"`
	CreatedAt   time.Time      `json:"created_at"`
	Splits      []ExpenseSplit `gorm:"foreignKey:ExpenseID"                           json:"splits,omitempty"`
}

type ExpenseSplit struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ExpenseID     uuid.UUID `gorm:"type:uuid;not null;index"                       json:"expense_id"`
	ParticipantID uuid.UUID `gorm:"type:uuid;not null"                             json:"participant_id"`
	AmountCents   int64     `gorm:"not null"                                       json:"amount_cents"`
}

// Settlement is immutable once created. Hard delete only.
type Settlement struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID     uuid.UUID `gorm:"type:uuid;not null;index"                       json:"group_id"`
	PayerID     uuid.UUID `gorm:"type:uuid;not null"                             json:"payer_id"`
	PayeeID     uuid.UUID `gorm:"type:uuid;not null"                             json:"payee_id"`
	AmountCents int64     `gorm:"not null"                                       json:"amount_cents"`
	Currency    string    `gorm:"not null;default:'USD'"                         json:"currency"`
	Date        time.Time `gorm:"not null"                                       json:"date"`
	Note        string    `json:"note"`
	CreatedAt   time.Time `json:"created_at"`
}
