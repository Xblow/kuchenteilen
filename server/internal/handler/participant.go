package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"kuchenteilen/internal/domain"
	"kuchenteilen/internal/repository"
)

type ParticipantHandler struct {
	participants *repository.ParticipantRepository
}

func NewParticipantHandler(p *repository.ParticipantRepository) *ParticipantHandler {
	return &ParticipantHandler{participants: p}
}

type createParticipantRequest struct {
	Name string `json:"name" binding:"required"`
}

type updateParticipantRequest struct {
	Name string `json:"name" binding:"required"`
}

// List godoc
// GET /api/groups/:token/participants
func (h *ParticipantHandler) List(c *gin.Context) {
	g := groupFromCtx(c)
	participants, err := h.participants.ListForGroup(g.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, participants)
}

// Create godoc
// POST /api/groups/:token/participants
func (h *ParticipantHandler) Create(c *gin.Context) {
	g := groupFromCtx(c)
	var req createParticipantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	p := &domain.Participant{
		ID:      uuid.New(),
		GroupID: g.ID,
		Name:    req.Name,
	}
	if err := h.participants.Create(p); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusCreated, p)
}

// Update godoc
// PUT /api/groups/:token/participants/:participantId
func (h *ParticipantHandler) Update(c *gin.Context) {
	g := groupFromCtx(c)
	participantID, err := uuid.Parse(c.Param("participantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid participant id"})
		return
	}
	var req updateParticipantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.participants.UpdateName(participantID, g.ID, req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}

// Delete godoc
// DELETE /api/groups/:token/participants/:participantId
func (h *ParticipantHandler) Delete(c *gin.Context) {
	g := groupFromCtx(c)
	participantID, err := uuid.Parse(c.Param("participantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid participant id"})
		return
	}
	if err := h.participants.Delete(participantID, g.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}
