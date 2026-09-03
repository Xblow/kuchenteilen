package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"kuchenteilen/internal/domain"
	"kuchenteilen/internal/repository"
)

type GroupHandler struct {
	groups *repository.GroupRepository
}

func NewGroupHandler(groups *repository.GroupRepository) *GroupHandler {
	return &GroupHandler{groups: groups}
}

type createGroupRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Currency    string `json:"currency"`
}

// Create godoc
// POST /api/groups
func (h *GroupHandler) Create(c *gin.Context) {
	var req createGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currency := strings.ToUpper(req.Currency)
	if currency == "" {
		currency = "USD"
	}

	g := &domain.Group{
		Name:        req.Name,
		Description: req.Description,
		Currency:    currency,
	}

	if err := h.groups.Create(g); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusCreated, g)
}

// Get godoc
// GET /api/groups/:token
func (h *GroupHandler) Get(c *gin.Context) {
	g := groupFromCtx(c)
	c.JSON(http.StatusOK, g)
}

type updateGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// Update godoc
// PUT /api/groups/:token
func (h *GroupHandler) Update(c *gin.Context) {
	g := groupFromCtx(c)
	var req updateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Name != "" {
		g.Name = req.Name
	}
	g.Description = req.Description
	if err := h.groups.Update(g); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, g)
}

type addCurrencyRequest struct {
	Currency string `json:"currency" binding:"required"`
}

// AddCurrency godoc
// POST /api/groups/:token/currencies
func (h *GroupHandler) AddCurrency(c *gin.Context) {
	g := groupFromCtx(c)
	var req addCurrencyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.groups.AddCurrency(g, req.Currency); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"currencies": g.Currencies})
}

// RotateToken godoc
// POST /api/groups/:token/rotate
func (h *GroupHandler) RotateToken(c *gin.Context) {
	g := groupFromCtx(c)
	newToken, err := h.groups.RotateToken(g)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"access_token": newToken})
}
