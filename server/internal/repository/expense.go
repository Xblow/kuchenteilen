package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"kuchenteilen/internal/domain"
)

type ExpenseRepository struct{ db *gorm.DB }

func NewExpenseRepository(db *gorm.DB) *ExpenseRepository { return &ExpenseRepository{db: db} }

// Append inserts a new expense row along with its splits in a transaction.
func (r *ExpenseRepository) Append(e *domain.Expense) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Splits").Create(e).Error; err != nil {
			return err
		}
		for i := range e.Splits {
			e.Splits[i].ExpenseID = e.ID
		}
		if len(e.Splits) > 0 {
			return tx.Create(&e.Splits).Error
		}
		return nil
	})
}

// ListCurrent returns the latest entry per record_id for the group, with splits loaded.
func (r *ExpenseRepository) ListCurrent(groupID uuid.UUID) ([]domain.Expense, error) {
	var expenses []domain.Expense
	err := r.db.Raw(
		`SELECT DISTINCT ON (record_id) expenses.* FROM expenses WHERE group_id = ? ORDER BY record_id, created_at DESC`,
		groupID,
	).Scan(&expenses).Error
	if err != nil {
		return nil, err
	}
	if err := r.loadSplits(expenses); err != nil {
		return nil, err
	}
	return expenses, nil
}

// ListHistory returns all entries for a given record_id, ordered oldest first, with splits.
func (r *ExpenseRepository) ListHistory(recordID uuid.UUID) ([]domain.Expense, error) {
	var expenses []domain.Expense
	err := r.db.Where("record_id = ?", recordID).Order("created_at asc").Find(&expenses).Error
	if err != nil {
		return nil, err
	}
	if err := r.loadSplits(expenses); err != nil {
		return nil, err
	}
	return expenses, nil
}

// Tombstone appends a deletion marker for the given record.
func (r *ExpenseRepository) Tombstone(recordID, groupID uuid.UUID) error {
	// Fetch currency from the latest entry for this record.
	var latest domain.Expense
	err := r.db.Where("record_id = ? AND group_id = ?", recordID, groupID).
		Order("created_at desc").
		First(&latest).Error
	if err != nil {
		return fmt.Errorf("expense record not found: %w", err)
	}

	tombstone := &domain.Expense{
		ID:          uuid.New(),
		RecordID:    recordID,
		GroupID:     groupID,
		PaidByID:    uuid.Nil,
		Description: "",
		AmountCents: 0,
		Currency:    latest.Currency,
		Date:        time.Now(),
	}
	return r.db.Omit("Splits").Create(tombstone).Error
}

// loadSplits populates Splits for a slice of expenses in one query.
func (r *ExpenseRepository) loadSplits(expenses []domain.Expense) error {
	if len(expenses) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, len(expenses))
	for i, e := range expenses {
		ids[i] = e.ID
	}

	var splits []domain.ExpenseSplit
	if err := r.db.Where("expense_id IN ?", ids).Find(&splits).Error; err != nil {
		return err
	}

	// Index splits by expense ID.
	index := make(map[uuid.UUID][]domain.ExpenseSplit)
	for _, s := range splits {
		index[s.ExpenseID] = append(index[s.ExpenseID], s)
	}
	for i := range expenses {
		expenses[i].Splits = index[expenses[i].ID]
	}
	return nil
}
