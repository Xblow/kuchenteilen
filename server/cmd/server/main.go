package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"kuchenteilen/internal/handler"
	"kuchenteilen/internal/repository"
	"kuchenteilen/internal/service"
)

func main() {
	_ = godotenv.Load()

	dsn := requireEnv("DATABASE_URL")
	port := getEnv("PORT", "8080")

	db, err := repository.Open(dsn)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	// Repositories
	groupRepo := repository.NewGroupRepository(db)
	participantRepo := repository.NewParticipantRepository(db)
	expenseRepo := repository.NewExpenseRepository(db)
	settlementRepo := repository.NewSettlementRepository(db)

	// Services
	expenseSvc := service.NewExpenseService(expenseRepo)
	settlementSvc := service.NewSettlementService(settlementRepo)

	// Handlers
	groupHandler := handler.NewGroupHandler(groupRepo)
	participantHandler := handler.NewParticipantHandler(participantRepo)
	expenseHandler := handler.NewExpenseHandler(expenseSvc)
	settlementHandler := handler.NewSettlementHandler(settlementSvc)
	balanceHandler := handler.NewBalanceHandler(expenseRepo, settlementRepo, participantRepo)

	r := gin.Default()
	r.SetTrustedProxies(nil) //nolint
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")

	// Create a group — no token needed
	api.POST("/groups", groupHandler.Create)

	// All other group routes are accessed via the access token
	grp := api.Group("/groups/:token", handler.GroupMiddleware(groupRepo))
	{
		grp.GET("", groupHandler.Get)
		grp.PUT("", groupHandler.Update)
		grp.POST("/currencies", groupHandler.AddCurrency)
		grp.POST("/rotate", groupHandler.RotateToken)

		grp.GET("/participants", participantHandler.List)
		grp.POST("/participants", participantHandler.Create)
		grp.PUT("/participants/:participantId", participantHandler.Update)
		grp.DELETE("/participants/:participantId", participantHandler.Delete)

		grp.GET("/expenses", expenseHandler.List)
		grp.POST("/expenses", expenseHandler.Create)
		grp.PUT("/expenses/:recordId", expenseHandler.Edit)
		grp.DELETE("/expenses/:recordId", expenseHandler.Tombstone)
		grp.GET("/expenses/:recordId/history", expenseHandler.History)

		grp.GET("/settlements", settlementHandler.List)
		grp.POST("/settlements", settlementHandler.Create)
		grp.DELETE("/settlements/:settlementId", settlementHandler.Delete)

		grp.GET("/balances", balanceHandler.Get)
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
