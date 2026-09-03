package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"kuchenteilen/internal/domain"
	"kuchenteilen/internal/repository"
)

const groupCtxKey = "group"

// GroupMiddleware looks up the group by :token and injects it into the context.
func GroupMiddleware(repo *repository.GroupRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")
		group, err := repo.FindByToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "group not found"})
			return
		}
		c.Set(groupCtxKey, group)
		c.Next()
	}
}

func groupFromCtx(c *gin.Context) *domain.Group {
	return c.MustGet(groupCtxKey).(*domain.Group)
}
