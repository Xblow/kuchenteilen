package repository

import (
	"crypto/rand"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"kuchenteilen/internal/domain"
)

type GroupRepository struct{ db *gorm.DB }

func NewGroupRepository(db *gorm.DB) *GroupRepository { return &GroupRepository{db: db} }

const tokenAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

func generateToken() (string, error) {
	const length = 24
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = tokenAlphabet[int(b[i])%len(tokenAlphabet)]
	}
	return string(b), nil
}

// Create generates a random access token, uppercases currency, initialises
// Currencies, and persists the group.
func (r *GroupRepository) Create(g *domain.Group) error {
	token, err := generateToken()
	if err != nil {
		return fmt.Errorf("generate token: %w", err)
	}
	g.AccessToken = token
	g.Currency = strings.ToUpper(g.Currency)
	if g.Currency == "" {
		g.Currency = "USD"
	}
	if len(g.Currencies) == 0 {
		g.Currencies = []string{g.Currency}
	}
	return r.db.Create(g).Error
}

// FindByToken looks up a group by its access token.
func (r *GroupRepository) FindByToken(token string) (*domain.Group, error) {
	var g domain.Group
	err := r.db.Where("access_token = ?", token).First(&g).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("group not found")
	}
	return &g, err
}

// Update saves all fields of the group.
func (r *GroupRepository) Update(g *domain.Group) error {
	return r.db.Save(g).Error
}

// AddCurrency uppercases the currency, deduplicates, and saves.
func (r *GroupRepository) AddCurrency(g *domain.Group, currency string) error {
	currency = strings.ToUpper(currency)
	for _, c := range g.Currencies {
		if c == currency {
			return nil // already present
		}
	}
	g.Currencies = append(g.Currencies, currency)
	return r.db.Save(g).Error
}

// RotateToken generates a new access token, saves it, and returns the new token.
func (r *GroupRepository) RotateToken(g *domain.Group) (string, error) {
	token, err := generateToken()
	if err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	g.AccessToken = token
	if err := r.db.Save(g).Error; err != nil {
		return "", err
	}
	return token, nil
}
