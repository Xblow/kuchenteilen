package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"kuchenteilen/internal/domain"
	"kuchenteilen/internal/repository"
)

type SettlementService struct {
	settlements *repository.SettlementRepository
}

func NewSettlementService(s *repository.SettlementRepository) *SettlementService {
	return &SettlementService{settlements: s}
}

func (s *SettlementService) Create(
	groupID uuid.UUID,
	payerID, payeeID uuid.UUID,
	amountCents int64,
	currency, note string,
	date time.Time,
) (*domain.Settlement, error) {
	if amountCents <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if payerID == payeeID {
		return nil, errors.New("payer and payee must be different")
	}
	if currency == "" {
		currency = "USD"
	}
	if date.IsZero() {
		date = time.Now()
	}

	st := &domain.Settlement{
		ID:          uuid.New(),
		GroupID:     groupID,
		PayerID:     payerID,
		PayeeID:     payeeID,
		AmountCents: amountCents,
		Currency:    currency,
		Date:        date,
		Note:        note,
	}
	if err := s.settlements.Create(st); err != nil {
		return nil, fmt.Errorf("create settlement: %w", err)
	}
	return st, nil
}

func (s *SettlementService) List(groupID uuid.UUID) ([]domain.Settlement, error) {
	return s.settlements.ListForGroup(groupID)
}

func (s *SettlementService) Delete(id, groupID uuid.UUID) error {
	return s.settlements.Delete(id, groupID)
}
