package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	sqlite "github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

// InitDB initializes the SQLite connection, auto-migrates schemas, and seeds sample data if empty.
func InitDB() {
	var err error
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "share_system.db"
	} else {
		// Ensure parent directory exists for the database file
		dir := filepath.Dir(dbPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("Warning: Failed to create database directory %s: %v", dir, err)
		}
	}
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto Migration
	err = DB.AutoMigrate(&Member{}, &Payment{}, &Setting{}, &Bid{})
	if err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	// Init settings if empty
	var settingCount int64
	DB.Model(&Setting{}).Count(&settingCount)
	if settingCount == 0 {
		DB.Create(&Setting{
			MonthlyAmount: 1000.0,
			UpdatedAt:     time.Now(),
		})
	}

	// Init sample data if members are empty
	var memberCount int64
	DB.Model(&Member{}).Count(&memberCount)
	if memberCount == 0 {
		seedSampleData()
	}
}

func seedSampleData() {
	members := []Member{
		{Name: "นายสมชาย ดีใจ", Phone: "081-111-2222", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นางสาวสมศรี มีสุข", Phone: "082-222-3333", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นายปิติ มั่นคง", Phone: "083-333-4444", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นางชูใจ รักดี", Phone: "084-444-5555", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นายมานะ อดทน", Phone: "085-555-6666", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นางสาววีณา เสียงทอง", Phone: "086-666-7777", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นายดำรง เกียรติภูมิ", Phone: "087-777-8888", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นางสาวสมพร บุญส่ง", Phone: "088-888-9999", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นายวิชัย รวยดี", Phone: "089-999-0000", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
		{Name: "นางนารี เลิศล้ำ", Phone: "090-000-1111", BidPassword: "1234", HasReceivedShare: false, InterestAmount: 0, CreatedAt: time.Now()},
	}

	// Save members
	for i := range members {
		DB.Create(&members[i])
	}

	// Create payments for the current month and year
	now := time.Now()
	month := int(now.Month())
	year := now.Year()

	var savedMembers []Member
	DB.Find(&savedMembers)

	for idx, m := range savedMembers {
		paid := false
		var paidDate *time.Time
		if idx == 0 || idx == 1 || idx == 2 {
			paid = true
			t := now.AddDate(0, 0, -idx)
			paidDate = &t
		}

		payment := Payment{
			MemberID: m.ID,
			Month:    month,
			Year:     year,
			Paid:     paid,
			PaidDate: paidDate,
		}
		DB.Create(&payment)
	}

	// Set Member 2 (index 1) as winner who has received share with interest 200
	if len(savedMembers) > 1 {
		savedMembers[1].HasReceivedShare = true
		savedMembers[1].InterestAmount = 200
		savedMembers[1].ReceivedMonth = month
		savedMembers[1].ReceivedYear = year
		DB.Save(&savedMembers[1])
	}

	fmt.Println("Database seeded with 10 sample members.")
}
