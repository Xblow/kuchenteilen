package service

import "kuchenteilen/internal/domain"

// BuildSplitsForTest exposes buildSplits to external test packages.
var BuildSplitsForTest = func(splitType SplitType, totalCents int64, inputs []SplitInput) ([]domain.ExpenseSplit, error) {
	return buildSplits(splitType, totalCents, inputs)
}
