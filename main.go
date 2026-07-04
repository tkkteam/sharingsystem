package main

import (
	"fmt"
	"html/template"
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	InitDB()

	// Initialize Gin router
	r := gin.Default()

	// Register template helper functions
	r.SetFuncMap(template.FuncMap{
		"add": func(a, b int) int {
			return a + b
		},
		"formatMoney": func(amount float64) string {
			s := fmt.Sprintf("%.0f", amount)
			if len(s) <= 3 {
				return s
			}
			var result []byte
			for i := 0; i < len(s); i++ {
				if i > 0 && (len(s)-i)%3 == 0 {
					result = append(result, ',')
				}
				result = append(result, s[i])
			}
			return string(result)
		},
	})

	// Load HTML templates
	r.LoadHTMLGlob("templates/*")

	// Serve static files
	r.Static("/static", "./static")

	// Routes
	r.GET("/", IndexHandler)
	r.POST("/login", LoginHandler)
	r.GET("/logout", LogoutHandler)
	r.POST("/member/add", AddMemberHandler)
	r.POST("/member/update", UpdateMemberHandler)
	r.POST("/member/delete", DeleteMemberHandler)
	r.POST("/payment/toggle", TogglePaymentHandler)
	r.POST("/payment/reset", ResetPaymentHandler)
	r.POST("/winner/save", SaveWinnerHandler)
	r.POST("/settings/update", UpdateSettingsHandler)

	// Run application
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
