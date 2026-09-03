package service_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"kuchenteilen/internal/domain"
	"kuchenteilen/internal/service"
)

func TestCalculateGroupBalances_EqualSplit(t *testing.T) {
	alice := uuid.New()
	bob := uuid.New()
	carol := uuid.New()

	// Alice paid $30, split equally among all three ($10 each)
	expense := domain.Expense{
		ID:          uuid.New(),
		PaidByID:    alice,
		AmountCents: 3000,
		Splits: []domain.ExpenseSplit{
			{ParticipantID: alice, AmountCents: 1000},
			{ParticipantID: bob, AmountCents: 1000},
			{ParticipantID: carol, AmountCents: 1000},
		},
	}

	names := map[uuid.UUID]string{alice: "Alice", bob: "Bob", carol: "Carol"}
	result := service.CalculateGroupBalances([]domain.Expense{expense}, nil, names)

	netByParticipant := make(map[uuid.UUID]int64)
	for _, pb := range result.ParticipantBalances {
		netByParticipant[pb.ParticipantID] = pb.NetCents
	}

	// Alice is owed 2000 (paid 3000, owes 1000 herself)
	assert.Equal(t, int64(2000), netByParticipant[alice], "alice net")
	// Bob and Carol each owe 1000
	assert.Equal(t, int64(-1000), netByParticipant[bob], "bob net")
	assert.Equal(t, int64(-1000), netByParticipant[carol], "carol net")
}

func TestCalculateGroupBalances_WithSettlement(t *testing.T) {
	alice := uuid.New()
	bob := uuid.New()

	// Alice paid $100, split equally ($50 each)
	expense := domain.Expense{
		ID:          uuid.New(),
		PaidByID:    alice,
		AmountCents: 10000,
		Splits: []domain.ExpenseSplit{
			{ParticipantID: alice, AmountCents: 5000},
			{ParticipantID: bob, AmountCents: 5000},
		},
	}

	// Bob partially settles $3000
	settlement := domain.Settlement{
		ID:          uuid.New(),
		PayerID:     bob,
		PayeeID:     alice,
		AmountCents: 3000,
	}

	names := map[uuid.UUID]string{alice: "Alice", bob: "Bob"}
	result := service.CalculateGroupBalances([]domain.Expense{expense}, []domain.Settlement{settlement}, names)

	netByParticipant := make(map[uuid.UUID]int64)
	for _, pb := range result.ParticipantBalances {
		netByParticipant[pb.ParticipantID] = pb.NetCents
	}

	// Bob still owes $20 after paying $30
	assert.Equal(t, int64(2000), netByParticipant[alice], "alice is owed 2000")
	assert.Equal(t, int64(-2000), netByParticipant[bob], "bob owes 2000")
}

func TestCalculateGroupBalances_SuggestedSettlements(t *testing.T) {
	alice := uuid.New()
	bob := uuid.New()
	carol := uuid.New()

	// Alice paid 6000, each owes 2000
	expense := domain.Expense{
		ID:          uuid.New(),
		PaidByID:    alice,
		AmountCents: 6000,
		Splits: []domain.ExpenseSplit{
			{ParticipantID: alice, AmountCents: 2000},
			{ParticipantID: bob, AmountCents: 2000},
			{ParticipantID: carol, AmountCents: 2000},
		},
	}

	names := map[uuid.UUID]string{alice: "Alice", bob: "Bob", carol: "Carol"}
	result := service.CalculateGroupBalances([]domain.Expense{expense}, nil, names)

	// Suggested: Bob->Alice 2000 and Carol->Alice 2000 (or similar minimal)
	assert.Len(t, result.SuggestedSettlements, 2)
	totalSuggested := int64(0)
	for _, s := range result.SuggestedSettlements {
		totalSuggested += s.AmountCents
		assert.Equal(t, alice, s.ToParticipantID)
	}
	assert.Equal(t, int64(4000), totalSuggested)
}

func TestCalculateGroupBalances_NoExpenses(t *testing.T) {
	alice := uuid.New()
	bob := uuid.New()

	names := map[uuid.UUID]string{alice: "Alice", bob: "Bob"}
	result := service.CalculateGroupBalances(nil, nil, names)

	assert.Len(t, result.ParticipantBalances, 2)
	for _, pb := range result.ParticipantBalances {
		assert.Equal(t, int64(0), pb.NetCents)
	}
	assert.Empty(t, result.SuggestedSettlements)
}

func TestCalculateGroupBalances_CrossDebts(t *testing.T) {
	alice := uuid.New()
	bob := uuid.New()

	// Alice paid 4000, Bob owes 2000
	exp1 := domain.Expense{
		ID: uuid.New(), PaidByID: alice, AmountCents: 4000,
		Splits: []domain.ExpenseSplit{
			{ParticipantID: alice, AmountCents: 2000},
			{ParticipantID: bob, AmountCents: 2000},
		},
	}
	// Bob paid 2000, Alice owes 1000
	exp2 := domain.Expense{
		ID: uuid.New(), PaidByID: bob, AmountCents: 2000,
		Splits: []domain.ExpenseSplit{
			{ParticipantID: alice, AmountCents: 1000},
			{ParticipantID: bob, AmountCents: 1000},
		},
	}

	names := map[uuid.UUID]string{alice: "Alice", bob: "Bob"}
	result := service.CalculateGroupBalances([]domain.Expense{exp1, exp2}, nil, names)

	netByParticipant := make(map[uuid.UUID]int64)
	for _, pb := range result.ParticipantBalances {
		netByParticipant[pb.ParticipantID] = pb.NetCents
	}

	// Net: Alice is owed 2000 - 1000 = 1000
	assert.Equal(t, int64(1000), netByParticipant[alice])
	assert.Equal(t, int64(-1000), netByParticipant[bob])

	// One suggested settlement: Bob -> Alice 1000
	assert.Len(t, result.SuggestedSettlements, 1)
	assert.Equal(t, int64(1000), result.SuggestedSettlements[0].AmountCents)
}
