package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"kuchenteilen/internal/domain"
	"kuchenteilen/internal/repository"
)

type SplitType string

const (
	SplitEqual SplitType = "equal"
	SplitExact SplitType = "exact"
)

type SplitInput struct {
	ParticipantID uuid.UUID
	AmountCents   int64 // only for SplitExact
}

type CreateExpenseInput struct {
	PaidByID    uuid.UUID
	Description string
	AmountCents int64
	Currency    string
	Date        time.Time
	SplitType   SplitType
	Splits      []SplitInput // participant list for equal; amounts for exact
}

type ExpenseService struct {
	expenses *repository.ExpenseRepository
}

func NewExpenseService(e *repository.ExpenseRepository) *ExpenseService {
	return &ExpenseService{expenses: e}
}

// Create builds splits and appends a new expense with a fresh RecordID.
func (s *ExpenseService) Create(groupID uuid.UUID, in CreateExpenseInput) (*domain.Expense, error) {
	if in.AmountCents <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if in.Description == "" {
		return nil, errors.New("description is required")
	}

	splits, err := buildSplits(in.SplitType, in.AmountCents, in.Splits)
	if err != nil {
		return nil, err
	}

	currency := in.Currency
	if currency == "" {
		currency = "USD"
	}

	exp := &domain.Expense{
		ID:          uuid.New(),
		RecordID:    uuid.New(),
		GroupID:     groupID,
		PaidByID:    in.PaidByID,
		Description: in.Description,
		AmountCents: in.AmountCents,
		Currency:    currency,
		Date:        in.Date,
		Splits:      splits,
	}

	if err := s.expenses.Append(exp); err != nil {
		return nil, fmt.Errorf("create expense: %w", err)
	}
	return exp, nil
}

// Edit appends a new revision of an existing record (same RecordID).
func (s *ExpenseService) Edit(recordID, groupID uuid.UUID, in CreateExpenseInput) (*domain.Expense, error) {
	if in.AmountCents <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if in.Description == "" {
		return nil, errors.New("description is required")
	}

	splits, err := buildSplits(in.SplitType, in.AmountCents, in.Splits)
	if err != nil {
		return nil, err
	}

	currency := in.Currency
	if currency == "" {
		currency = "USD"
	}

	exp := &domain.Expense{
		ID:          uuid.New(),
		RecordID:    recordID,
		GroupID:     groupID,
		PaidByID:    in.PaidByID,
		Description: in.Description,
		AmountCents: in.AmountCents,
		Currency:    currency,
		Date:        in.Date,
		Splits:      splits,
	}

	if err := s.expenses.Append(exp); err != nil {
		return nil, fmt.Errorf("edit expense: %w", err)
	}
	return exp, nil
}

// Tombstone marks a record as deleted.
func (s *ExpenseService) Tombstone(recordID, groupID uuid.UUID) error {
	return s.expenses.Tombstone(recordID, groupID)
}

// ListCurrent returns the current (latest) entry per record for the group.
func (s *ExpenseService) ListCurrent(groupID uuid.UUID) ([]domain.Expense, error) {
	return s.expenses.ListCurrent(groupID)
}

// GetHistory returns all versions of a record, oldest first.
func (s *ExpenseService) GetHistory(recordID uuid.UUID) ([]domain.Expense, error) {
	return s.expenses.ListHistory(recordID)
}

// buildSplits creates ExpenseSplit records from the input.
func buildSplits(splitType SplitType, totalCents int64, inputs []SplitInput) ([]domain.ExpenseSplit, error) {
	if len(inputs) == 0 {
		return nil, errors.New("at least one split participant required")
	}

	switch splitType {
	case SplitEqual:
		return buildEqualSplits(totalCents, inputs)
	case SplitExact:
		return buildExactSplits(totalCents, inputs)
	default:
		return nil, fmt.Errorf("unknown split type: %s", splitType)
	}
}

func buildEqualSplits(totalCents int64, inputs []SplitInput) ([]domain.ExpenseSplit, error) {
	n := int64(len(inputs))
	base := totalCents / n
	remainder := totalCents % n

	splits := make([]domain.ExpenseSplit, len(inputs))
	for i, inp := range inputs {
		amt := base
		if int64(i) < remainder {
			amt++
		}
		splits[i] = domain.ExpenseSplit{
			ID:            uuid.New(),
			ParticipantID: inp.ParticipantID,
			AmountCents:   amt,
		}
	}
	return splits, nil
}

func buildExactSplits(totalCents int64, inputs []SplitInput) ([]domain.ExpenseSplit, error) {
	var sum int64
	for _, inp := range inputs {
		if inp.AmountCents < 0 {
			return nil, errors.New("split amounts must be non-negative")
		}
		sum += inp.AmountCents
	}
	if sum != totalCents {
		return nil, fmt.Errorf("split amounts sum to %d but expense total is %d", sum, totalCents)
	}

	splits := make([]domain.ExpenseSplit, len(inputs))
	for i, inp := range inputs {
		splits[i] = domain.ExpenseSplit{
			ID:            uuid.New(),
			ParticipantID: inp.ParticipantID,
			AmountCents:   inp.AmountCents,
		}
	}
	return splits, nil
}
