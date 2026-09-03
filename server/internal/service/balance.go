package service

import (
	"sort"

	"github.com/google/uuid"
	"kuchenteilen/internal/domain"
)

type ParticipantBalance struct {
	ParticipantID   uuid.UUID `json:"participant_id"`
	ParticipantName string    `json:"participant_name"`
	NetCents        int64     `json:"net_cents"`
}

type SuggestedSettlement struct {
	FromParticipantID   uuid.UUID `json:"from_participant_id"`
	FromParticipantName string    `json:"from_participant_name"`
	ToParticipantID     uuid.UUID `json:"to_participant_id"`
	ToParticipantName   string    `json:"to_participant_name"`
	AmountCents         int64     `json:"amount_cents"`
}

type CurrencyBalances struct {
	ParticipantBalances  []ParticipantBalance  `json:"participant_balances"`
	SuggestedSettlements []SuggestedSettlement `json:"suggested_settlements"`
}

// GroupBalances is keyed by currency code. Each currency is settled independently.
type GroupBalances struct {
	Currencies map[string]CurrencyBalances `json:"currencies"`
}

func CalculateGroupBalances(
	expenses []domain.Expense,
	settlements []domain.Settlement,
	participantNames map[uuid.UUID]string,
) GroupBalances {
	// Collect all currencies present in expenses and settlements.
	currencySet := make(map[string]struct{})
	for _, e := range expenses {
		currencySet[e.Currency] = struct{}{}
	}
	for _, s := range settlements {
		currencySet[s.Currency] = struct{}{}
	}

	result := GroupBalances{Currencies: make(map[string]CurrencyBalances)}

	for currency := range currencySet {
		var currExpenses []domain.Expense
		for _, e := range expenses {
			if e.Currency == currency {
				currExpenses = append(currExpenses, e)
			}
		}
		var currSettlements []domain.Settlement
		for _, s := range settlements {
			if s.Currency == currency {
				currSettlements = append(currSettlements, s)
			}
		}
		result.Currencies[currency] = calculateForCurrency(currExpenses, currSettlements, participantNames)
	}

	return result
}

func calculateForCurrency(
	expenses []domain.Expense,
	settlements []domain.Settlement,
	participantNames map[uuid.UUID]string,
) CurrencyBalances {
	rawDebt := make(map[uuid.UUID]map[uuid.UUID]int64)

	add := func(debtor, creditor uuid.UUID, cents int64) {
		if rawDebt[debtor] == nil {
			rawDebt[debtor] = make(map[uuid.UUID]int64)
		}
		rawDebt[debtor][creditor] += cents
	}

	for _, exp := range expenses {
		for _, split := range exp.Splits {
			if split.ParticipantID == exp.PaidByID {
				continue
			}
			add(split.ParticipantID, exp.PaidByID, split.AmountCents)
		}
	}

	for _, s := range settlements {
		add(s.PayerID, s.PayeeID, -s.AmountCents)
	}

	netDebt := make(map[uuid.UUID]map[uuid.UUID]int64)
	netAdd := func(debtor, creditor uuid.UUID, cents int64) {
		if netDebt[debtor] == nil {
			netDebt[debtor] = make(map[uuid.UUID]int64)
		}
		netDebt[debtor][creditor] += cents
	}

	seen := make(map[[2]uuid.UUID]bool)
	for debtor, creditors := range rawDebt {
		for creditor, amt := range creditors {
			pair := pairKey(debtor, creditor)
			if seen[pair] {
				continue
			}
			seen[pair] = true

			aOwesB := amt
			bOwesA := int64(0)
			if rawDebt[creditor] != nil {
				bOwesA = rawDebt[creditor][debtor]
			}
			net := aOwesB - bOwesA
			if net > 0 {
				netAdd(debtor, creditor, net)
			} else if net < 0 {
				netAdd(creditor, debtor, -net)
			}
		}
	}

	allParticipants := make(map[uuid.UUID]struct{})
	for id := range participantNames {
		allParticipants[id] = struct{}{}
	}

	netCents := make(map[uuid.UUID]int64)
	for id := range allParticipants {
		netCents[id] = 0
	}
	for debtor, creditors := range netDebt {
		for creditor, amt := range creditors {
			netCents[debtor] -= amt
			netCents[creditor] += amt
		}
	}

	// Only include participants with non-zero balances in this currency.
	var participantBalances []ParticipantBalance
	for id, net := range netCents {
		if net == 0 {
			continue
		}
		participantBalances = append(participantBalances, ParticipantBalance{
			ParticipantID:   id,
			ParticipantName: participantNames[id],
			NetCents:        net,
		})
	}
	sort.Slice(participantBalances, func(i, j int) bool {
		return participantBalances[i].ParticipantName < participantBalances[j].ParticipantName
	})

	suggested := suggestSettlements(netCents, participantNames)

	return CurrencyBalances{
		ParticipantBalances:  participantBalances,
		SuggestedSettlements: suggested,
	}
}

func suggestSettlements(netCents map[uuid.UUID]int64, names map[uuid.UUID]string) []SuggestedSettlement {
	type entry struct {
		id  uuid.UUID
		net int64
	}

	var debtors, creditors []entry
	for id, net := range netCents {
		if net < 0 {
			debtors = append(debtors, entry{id, -net})
		} else if net > 0 {
			creditors = append(creditors, entry{id, net})
		}
	}

	sort.Slice(debtors, func(i, j int) bool { return debtors[i].net > debtors[j].net })
	sort.Slice(creditors, func(i, j int) bool { return creditors[i].net > creditors[j].net })

	var result []SuggestedSettlement
	i, j := 0, 0
	for i < len(debtors) && j < len(creditors) {
		d, c := debtors[i], creditors[j]
		amt := d.net
		if c.net < amt {
			amt = c.net
		}
		result = append(result, SuggestedSettlement{
			FromParticipantID:   d.id,
			FromParticipantName: names[d.id],
			ToParticipantID:     c.id,
			ToParticipantName:   names[c.id],
			AmountCents:         amt,
		})
		debtors[i].net -= amt
		creditors[j].net -= amt
		if debtors[i].net == 0 {
			i++
		}
		if creditors[j].net == 0 {
			j++
		}
	}
	return result
}

func pairKey(a, b uuid.UUID) [2]uuid.UUID {
	if a.String() < b.String() {
		return [2]uuid.UUID{a, b}
	}
	return [2]uuid.UUID{b, a}
}
