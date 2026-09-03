package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"kuchenteilen/internal/repository"
	"kuchenteilen/internal/service"
)

type BalanceHandler struct {
	expenses     *repository.ExpenseRepository
	settlements  *repository.SettlementRepository
	participants *repository.ParticipantRepository
}

func NewBalanceHandler(
	e *repository.ExpenseRepository,
	s *repository.SettlementRepository,
	p *repository.ParticipantRepository,
) *BalanceHandler {
	return &BalanceHandler{expenses: e, settlements: s, participants: p}
}

// Get godoc
// GET /api/groups/:token/balances
func (h *BalanceHandler) Get(c *gin.Context) {
	g := groupFromCtx(c)

	expenses, err := h.expenses.ListCurrent(g.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	settlements, err := h.settlements.ListForGroup(g.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	participants, err := h.participants.ListForGroup(g.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	nameMap := make(map[uuid.UUID]string, len(participants))
	for _, p := range participants {
		nameMap[p.ID] = p.Name
	}

	balances := service.CalculateGroupBalances(expenses, settlements, nameMap)
	c.JSON(http.StatusOK, balances)
}
