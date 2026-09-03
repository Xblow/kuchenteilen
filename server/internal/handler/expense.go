package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"kuchenteilen/internal/service"
)

type ExpenseHandler struct {
	expenses *service.ExpenseService
}

func NewExpenseHandler(e *service.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{expenses: e}
}

type splitInputDTO struct {
	ParticipantID uuid.UUID `json:"participant_id" binding:"required"`
	AmountCents   int64     `json:"amount_cents"`
}

type createExpenseRequest struct {
	PaidByID    uuid.UUID       `json:"paid_by_id" binding:"required"`
	Description string          `json:"description" binding:"required"`
	AmountCents int64           `json:"amount_cents" binding:"required,gt=0"`
	Currency    string          `json:"currency"`
	Date        time.Time       `json:"date" binding:"required"`
	SplitType   string          `json:"split_type" binding:"required,oneof=equal exact"`
	Splits      []splitInputDTO `json:"splits" binding:"required,min=1"`
}

func toSplitInputs(dtos []splitInputDTO) []service.SplitInput {
	out := make([]service.SplitInput, len(dtos))
	for i, d := range dtos {
		out[i] = service.SplitInput{ParticipantID: d.ParticipantID, AmountCents: d.AmountCents}
	}
	return out
}

// List godoc
// GET /api/groups/:token/expenses
func (h *ExpenseHandler) List(c *gin.Context) {
	g := groupFromCtx(c)
	expenses, err := h.expenses.ListCurrent(g.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	// Exclude tombstones (AmountCents == 0)
	active := expenses[:0]
	for _, e := range expenses {
		if e.AmountCents > 0 {
			active = append(active, e)
		}
	}
	c.JSON(http.StatusOK, active)
}

// Create godoc
// POST /api/groups/:token/expenses
func (h *ExpenseHandler) Create(c *gin.Context) {
	g := groupFromCtx(c)
	var req createExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exp, err := h.expenses.Create(g.ID, service.CreateExpenseInput{
		PaidByID:    req.PaidByID,
		Description: req.Description,
		AmountCents: req.AmountCents,
		Currency:    req.Currency,
		Date:        req.Date,
		SplitType:   service.SplitType(req.SplitType),
		Splits:      toSplitInputs(req.Splits),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, exp)
}

// Edit godoc
// PUT /api/groups/:token/expenses/:recordId
func (h *ExpenseHandler) Edit(c *gin.Context) {
	g := groupFromCtx(c)
	recordID, err := uuid.Parse(c.Param("recordId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid record id"})
		return
	}
	var req createExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exp, err := h.expenses.Edit(recordID, g.ID, service.CreateExpenseInput{
		PaidByID:    req.PaidByID,
		Description: req.Description,
		AmountCents: req.AmountCents,
		Currency:    req.Currency,
		Date:        req.Date,
		SplitType:   service.SplitType(req.SplitType),
		Splits:      toSplitInputs(req.Splits),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, exp)
}

// Tombstone godoc
// DELETE /api/groups/:token/expenses/:recordId
func (h *ExpenseHandler) Tombstone(c *gin.Context) {
	g := groupFromCtx(c)
	recordID, err := uuid.Parse(c.Param("recordId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid record id"})
		return
	}
	if err := h.expenses.Tombstone(recordID, g.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}

// History godoc
// GET /api/groups/:token/expenses/:recordId/history
func (h *ExpenseHandler) History(c *gin.Context) {
	recordID, err := uuid.Parse(c.Param("recordId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid record id"})
		return
	}
	history, err := h.expenses.GetHistory(recordID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, history)
}
