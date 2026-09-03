package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"kuchenteilen/internal/domain"
)

type SettlementRepository struct{ db *gorm.DB }

func NewSettlementRepository(db *gorm.DB) *SettlementRepository {
	return &SettlementRepository{db: db}
}

func (r *SettlementRepository) Create(s *domain.Settlement) error {
	return r.db.Create(s).Error
}

func (r *SettlementRepository) ListForGroup(groupID uuid.UUID) ([]domain.Settlement, error) {
	var settlements []domain.Settlement
	err := r.db.Where("group_id = ?", groupID).Order("created_at asc").Find(&settlements).Error
	return settlements, err
}

func (r *SettlementRepository) Delete(id, groupID uuid.UUID) error {
	return r.db.Where("id = ? AND group_id = ?", id, groupID).Delete(&domain.Settlement{}).Error
}
