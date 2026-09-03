package service_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"kuchenteilen/internal/service"
)

// buildSplitsEqual and buildSplitsExact are exercised indirectly through
// exported service methods. We test the logic via a mock that accepts the
// service input and validates the output.

func TestEqualSplit_EvenAmount(t *testing.T) {
	participantIDs := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	splits := makeSplitInputs(participantIDs, nil)

	input := service.CreateExpenseInput{
		PaidByID:    participantIDs[0],
		Description: "Dinner",
		AmountCents: 3000,
		Currency:    "USD",
		Date:        time.Now(),
		SplitType:   service.SplitEqual,
		Splits:      splits,
	}

	svc := service.NewExpenseService(nil)
	// We can't call svc.Create without a real repo, so we test buildSplits
	// logic by calling the exported BuildSplitsForTest helper.
	result, err := service.BuildSplitsForTest(input.SplitType, input.AmountCents, input.Splits)
	require.NoError(t, err)
	assert.Len(t, result, 3)

	var total int64
	for _, s := range result {
		total += s.AmountCents
	}
	assert.Equal(t, int64(3000), total)
	for _, s := range result {
		assert.Equal(t, int64(1000), s.AmountCents)
	}
	_ = svc
}

func TestEqualSplit_OddAmount(t *testing.T) {
	participantIDs := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	splits := makeSplitInputs(participantIDs, nil)

	result, err := service.BuildSplitsForTest(service.SplitEqual, 1001, splits)
	require.NoError(t, err)
	assert.Len(t, result, 3)

	var total int64
	for _, s := range result {
		total += s.AmountCents
	}
	assert.Equal(t, int64(1001), total)
}

func TestExactSplit_Valid(t *testing.T) {
	participantIDs := []uuid.UUID{uuid.New(), uuid.New()}
	splits := makeSplitInputs(participantIDs, []int64{700, 300})

	result, err := service.BuildSplitsForTest(service.SplitExact, 1000, splits)
	require.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, int64(700), result[0].AmountCents)
	assert.Equal(t, int64(300), result[1].AmountCents)
}

func TestExactSplit_MismatchTotal(t *testing.T) {
	participantIDs := []uuid.UUID{uuid.New(), uuid.New()}
	splits := makeSplitInputs(participantIDs, []int64{700, 200}) // sums to 900, not 1000

	_, err := service.BuildSplitsForTest(service.SplitExact, 1000, splits)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "sum to")
}

func TestExactSplit_NegativeAmount(t *testing.T) {
	participantIDs := []uuid.UUID{uuid.New()}
	splits := makeSplitInputs(participantIDs, []int64{-100})

	_, err := service.BuildSplitsForTest(service.SplitExact, -100, splits)
	require.Error(t, err)
}

func TestUnknownSplitType(t *testing.T) {
	participantIDs := []uuid.UUID{uuid.New()}
	splits := makeSplitInputs(participantIDs, nil)

	_, err := service.BuildSplitsForTest("proportional", 1000, splits)
	require.Error(t, err)
}

func makeSplitInputs(ids []uuid.UUID, amounts []int64) []service.SplitInput {
	out := make([]service.SplitInput, len(ids))
	for i, id := range ids {
		out[i] = service.SplitInput{ParticipantID: id}
		if amounts != nil && i < len(amounts) {
			out[i].AmountCents = amounts[i]
		}
	}
	return out
}
