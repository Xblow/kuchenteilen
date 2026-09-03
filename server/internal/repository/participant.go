package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"kuchenteilen/internal/domain"
)

type ParticipantRepository struct{ db *gorm.DB }

func NewParticipantRepository(db *gorm.DB) *ParticipantRepository {
	return &ParticipantRepository{db: db}
}

func (r *ParticipantRepository) Create(p *domain.Participant) error {
	return r.db.Create(p).Error
}

func (r *ParticipantRepository) ListForGroup(groupID uuid.UUID) ([]domain.Participant, error) {
	var participants []domain.Participant
	err := r.db.Where("group_id = ?", groupID).Order("created_at asc").Find(&participants).Error
	return participants, err
}

func (r *ParticipantRepository) UpdateName(id, groupID uuid.UUID, name string) error {
	return r.db.Model(&domain.Participant{}).
		Where("id = ? AND group_id = ?", id, groupID).
		Update("name", name).Error
}

func (r *ParticipantRepository) Delete(id, groupID uuid.UUID) error {
	return r.db.Where("id = ? AND group_id = ?", id, groupID).Delete(&domain.Participant{}).Error
}
