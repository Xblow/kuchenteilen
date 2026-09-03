package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"kuchenteilen/internal/service"
)

type SettlementHandler struct {
	settlements *service.SettlementService
}

func NewSettlementHandler(s *service.SettlementService) *SettlementHandler {
	return &SettlementHandler{settlements: s}
}

type createSettlementRequest struct {
	PayerID     uuid.UUID `json:"payer_id" binding:"required"`
	PayeeID     uuid.UUID `json:"payee_id" binding:"required"`
	AmountCents int64     `json:"amount_cents" binding:"required,gt=0"`
	Currency    string    `json:"currency"`
	Date        time.Time `json:"date"`
	Note        string    `json:"note"`
}

// Create godoc
// POST /api/groups/:token/settlements
func (h *SettlementHandler) Create(c *gin.Context) {
	g := groupFromCtx(c)
	var req createSettlementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	s, err := h.settlements.Create(
		g.ID,
		req.PayerID,
		req.PayeeID,
		req.AmountCents,
		req.Currency,
		req.Note,
		req.Date,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

// List godoc
// GET /api/groups/:token/settlements
func (h *SettlementHandler) List(c *gin.Context) {
	g := groupFromCtx(c)
	settlements, err := h.settlements.List(g.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, settlements)
}

// Delete godoc
// DELETE /api/groups/:token/settlements/:settlementId
func (h *SettlementHandler) Delete(c *gin.Context) {
	g := groupFromCtx(c)
	id, err := uuid.Parse(c.Param("settlementId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid settlement id"})
		return
	}
	if err := h.settlements.Delete(id, g.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}
