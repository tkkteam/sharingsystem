package main

import (
	"time"
)

// Member represents the share ring member
type Member struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Name             string    `gorm:"type:varchar(100);not null" json:"name"`
	Phone            string    `gorm:"type:varchar(20)" json:"phone"`
	HasReceivedShare bool      `gorm:"default:false" json:"has_received_share"`
	InterestAmount   float64   `gorm:"default:0" json:"interest_amount"`
	ReceivedMonth    int       `gorm:"default:0" json:"received_month"`
	ReceivedYear     int       `gorm:"default:0" json:"received_year"`
	CreatedAt        time.Time `json:"created_at"`
}

// Payment represents a monthly payment of a member
type Payment struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	MemberID  uint       `gorm:"not null" json:"member_id"`
	Member    Member     `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member"`
	Month     int        `gorm:"not null" json:"month"`
	Year      int        `gorm:"not null" json:"year"`
	Paid      bool       `gorm:"default:false" json:"paid"`
	PaidDate  *time.Time `json:"paid_date"`
}

// Setting represents the global configuration
type Setting struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	MonthlyAmount float64   `gorm:"default:1000" json:"monthly_amount"`
	UpdatedAt     time.Time `json:"updated_at"`
}
