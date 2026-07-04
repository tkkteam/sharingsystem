package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type SheetsResponse struct {
	Members  []Member  `json:"members"`
	Payments []Payment `json:"payments"`
	Bids     []Bid     `json:"bids"`
	Setting  struct {
		MonthlyAmount   float64    `json:"MonthlyAmount"`
		AuctionDeadline *time.Time `json:"AuctionDeadline"`
	} `json:"setting"`
}

func getSheetsURL() string {
	return os.Getenv("SHEETS_API_URL")
}

func fetchSheetsData() ([]Member, []Payment, []Bid, Setting, error) {
	url := getSheetsURL()
	resp, err := http.Get(url)
	if err != nil {
		return nil, nil, nil, Setting{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, nil, Setting{}, fmt.Errorf("bad status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, nil, Setting{}, err
	}

	var sr SheetsResponse
	if err := json.Unmarshal(bodyBytes, &sr); err != nil {
		return nil, nil, nil, Setting{}, err
	}

	s := Setting{
		MonthlyAmount:   sr.Setting.MonthlyAmount,
		AuctionDeadline: sr.Setting.AuctionDeadline,
		UpdatedAt:       time.Now(),
	}

	return sr.Members, sr.Payments, sr.Bids, s, nil
}

func sheetsPost(payload interface{}) error {
	url := getSheetsURL()
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad response status: %d", resp.StatusCode)
	}
	return nil
}

func addMemberSheets(name, phone, bidPassword string) error {
	payload := map[string]interface{}{
		"action":       "add_member",
		"name":         name,
		"phone":        phone,
		"bid_password": bidPassword,
	}
	return sheetsPost(payload)
}

func updateMemberSheets(m Member) error {
	payload := map[string]interface{}{
		"action":             "update_member",
		"id":                 m.ID,
		"name":               m.Name,
		"phone":              m.Phone,
		"bid_password":       m.BidPassword,
		"has_received_share": m.HasReceivedShare,
		"interest_amount":    m.InterestAmount,
		"received_month":     m.ReceivedMonth,
		"received_year":      m.ReceivedYear,
	}
	return sheetsPost(payload)
}

func deleteMemberSheets(id uint) error {
	payload := map[string]interface{}{
		"action": "delete_member",
		"id":     id,
	}
	return sheetsPost(payload)
}

func togglePaymentSheets(memberID uint, month, year int) error {
	payload := map[string]interface{}{
		"action":    "toggle_payment",
		"member_id": memberID,
		"month":     month,
		"year":      year,
	}
	return sheetsPost(payload)
}

func resetPaymentSheets(month, year int) error {
	payload := map[string]interface{}{
		"action": "reset_payment",
		"month":  month,
		"year":   year,
	}
	return sheetsPost(payload)
}

func updateSettingsSheets(monthlyAmount float64, deadline *time.Time) error {
	payload := map[string]interface{}{
		"action":         "update_settings",
		"monthly_amount": monthlyAmount,
		"deadline":       deadline,
	}
	return sheetsPost(payload)
}

func submitBidSheets(memberID uint, month, year int, amount float64) error {
	payload := map[string]interface{}{
		"action":    "submit_bid",
		"member_id": memberID,
		"month":     month,
		"year":      year,
		"amount":    amount,
	}
	return sheetsPost(payload)
}
