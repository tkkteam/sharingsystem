package main

import (
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata"

	"github.com/gin-gonic/gin"
)

// MemberRow structures the row data for frontend table
type MemberRow struct {
	Member           Member
	Payment          Payment
	NextPaymentValue float64
	WinnerNumber     int
	BidAmount        float64
	HasBid           bool
}

// MonthSummary represents the monthly financial summary report
type MonthSummary struct {
	MonthName      string  `json:"month_name"`
	PaidCount      int     `json:"paid_count"`
	TotalMembers   int     `json:"total_members"`
	PrincipalMoney float64 `json:"principal_money"`
	InterestMoney  float64 `json:"interest_money"`
	TotalMoney     float64 `json:"total_money"`
}

// IndexHandler renders the main dashboard and member tables
func IndexHandler(c *gin.Context) {
	now := time.Now()
	monthStr := c.DefaultQuery("month", strconv.Itoa(int(now.Month())))
	yearStr := c.DefaultQuery("year", strconv.Itoa(now.Year()))
	search := c.Query("search")
	msg := c.Query("msg")
	errMsg := c.Query("error")

	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)

	// Ensure valid month & year
	if month < 1 || month > 12 {
		month = int(now.Month())
	}
	if year < 2000 {
		year = now.Year()
	}

	var alertMsg string
	if msg == "login_success" {
		alertMsg = "เข้าสู่ระบบในฐานะผู้ดูแลระบบสำเร็จ!"
	} else if msg == "logout_success" {
		alertMsg = "ออกจากระบบเรียบร้อยแล้ว"
	} else if msg == "reset_success" {
		alertMsg = "รีเซ็ตสถานะการชำระเงินของงวดนี้เป็น 'ยังไม่ชำระ' สำเร็จ!"
	} else if msg == "bid_success" {
		alertMsg = "เสนอราคายอดดอกเบี้ยประมูลสำเร็จเรียบร้อยแล้ว!"
	}

	var alertErr string
	if errMsg == "login_failed" {
		alertErr = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"
	} else if errMsg == "unauthorized" {
		alertErr = "เกิดข้อผิดพลาด: สิทธิ์การใช้งานนี้ถูกจำกัดเฉพาะผู้ดูแลระบบ (Admin) เท่านั้น!"
	} else if errMsg == "invalid_pin" {
		alertErr = "รหัสผ่านประมูล (PIN) ของสมาชิกไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง!"
	} else if errMsg == "bid_deadline_passed" {
		alertErr = "ขออภัย: หมดเวลาเสนอราคาประมูลสำหรับงวดนี้แล้ว (เกินกำหนดเวลาประมูล)!"
	} else if errMsg == "invalid_bid_amount" {
		alertErr = "จำนวนดอกเบี้ยประมูลที่เสนอไม่ถูกต้อง!"
	} else if errMsg == "already_received" {
		alertErr = "สมาชิกคนนี้ได้รับแชร์ในอดีตไปแล้ว ไม่สามารถเสนอราคาประมูลได้อีก!"
	} else if errMsg == "bid_not_started" {
		alertErr = "ขออภัย: ขณะนี้ระบบยังไม่เปิดระบบรับเสนอราคาประมูลแชร์ประจำงวด!"
	}

	// Fetch current setting
	var setting Setting
	var allMembers []Member
	var payments []Payment
	var allPayments []Payment
	var allBids []Bid
	var monthBids []Bid
	var isUsingSheets bool

	sheetsURL := getSheetsURL()
	if sheetsURL != "" {
		var err error
		allMembers, allPayments, allBids, setting, err = fetchSheetsData()
		if err != nil {
			log.Printf("Error fetching sheets data: %v. Falling back to GORM SQLite.", err)
		} else {
			isUsingSheets = true
			// Filter payments for the selected month and year
			for _, p := range allPayments {
				if p.Month == month && p.Year == year {
					payments = append(payments, p)
				}
			}
			// Filter bids for the selected month and year
			for _, b := range allBids {
				if b.Month == month && b.Year == year {
					monthBids = append(monthBids, b)
				}
			}
		}
	}

	if !isUsingSheets {
		if err := DB.First(&setting, 1).Error; err != nil {
			setting = Setting{MonthlyAmount: 1000}
		}

		// Ensure payments exist for all members for this month/year
		DB.Find(&allMembers)
		for _, m := range allMembers {
			var payment Payment
			err := DB.Where("member_id = ? AND month = ? AND year = ?", m.ID, month, year).First(&payment).Error
			if err != nil {
				newPayment := Payment{
					MemberID: m.ID,
					Month:    month,
					Year:     year,
					Paid:     false,
				}
				DB.Create(&newPayment)
			}
		}

		// Fetch all payments for this month/year
		DB.Where("month = ? AND year = ?", month, year).Find(&payments)
		// Fetch all payments for this year (for report)
		DB.Where("year = ?", year).Find(&allPayments)
		// Fetch month bids
		DB.Where("month = ? AND year = ?", month, year).Find(&monthBids)
		// Fetch all bids
		DB.Find(&allBids)
	}

	// Fetch members matching search (or all)
	var members []Member
	if isUsingSheets {
		if search != "" {
			searchLower := strings.ToLower(search)
			for _, m := range allMembers {
				if strings.Contains(strings.ToLower(m.Name), searchLower) || strings.Contains(strings.ToLower(m.Phone), searchLower) {
					members = append(members, m)
				}
			}
		} else {
			members = allMembers
		}
	} else {
		if search != "" {
			DB.Where("name LIKE ? OR phone LIKE ?", "%"+search+"%", "%"+search+"%").Find(&members)
		} else {
			DB.Find(&members)
		}
	}

	// Map payments by MemberID for fast lookup
	paymentMap := make(map[uint]Payment)
	for _, p := range payments {
		paymentMap[p.MemberID] = p
	}

	// Map bids by MemberID
	bidMap := make(map[uint]Bid)
	for _, b := range monthBids {
		bidMap[b.MemberID] = b
	}

	// Fetch all winners sorted chronologically to determine their sequence number
	var winners []Member
	if isUsingSheets {
		for _, m := range allMembers {
			if m.HasReceivedShare {
				winners = append(winners, m)
			}
		}
		sort.Slice(winners, func(i, j int) bool {
			if winners[i].ReceivedYear != winners[j].ReceivedYear {
				return winners[i].ReceivedYear < winners[j].ReceivedYear
			}
			if winners[i].ReceivedMonth != winners[j].ReceivedMonth {
				return winners[i].ReceivedMonth < winners[j].ReceivedMonth
			}
			return winners[i].ID < winners[j].ID
		})
	} else {
		DB.Where("has_received_share = ?", true).Order("received_year asc, received_month asc, id asc").Find(&winners)
	}

	winnerNumberMap := make(map[uint]int)
	for idx, w := range winners {
		winnerNumberMap[w.ID] = idx + 1
	}

	// Build rows and calculate stats over all members (for accuracy)
	var rows []MemberRow
	var paidCount int64 = 0
	var unpaidCount int64 = 0
	var collectedMoney float64 = 0

	for _, m := range allMembers {
		p, exists := paymentMap[m.ID]
		paid := false
		if exists && p.Paid {
			paid = true
		}
		isDead := m.HasReceivedShare && (m.ReceivedYear < year || (m.ReceivedYear == year && m.ReceivedMonth <= month))
		if paid {
			paidCount++
			if isDead {
				collectedMoney += setting.MonthlyAmount + m.InterestAmount
			} else {
				collectedMoney += setting.MonthlyAmount
			}
		} else {
			unpaidCount++
		}
	}

	// Build table rows
	for _, m := range members {
		payment, exists := paymentMap[m.ID]
		if !exists {
			payment = Payment{MemberID: m.ID, Month: month, Year: year, Paid: false}
		}

		isDead := m.HasReceivedShare && (m.ReceivedYear < year || (m.ReceivedYear == year && m.ReceivedMonth <= month))
		nextPayment := setting.MonthlyAmount
		if isDead {
			nextPayment = setting.MonthlyAmount + m.InterestAmount
		}

		winnerNum := winnerNumberMap[m.ID]

		b, hasBid := bidMap[m.ID]
		bidAmount := 0.0
		if hasBid {
			bidAmount = b.Amount
		}

		rows = append(rows, MemberRow{
			Member:           m,
			Payment:          payment,
			NextPaymentValue: nextPayment,
			WinnerNumber:     winnerNum,
			BidAmount:        bidAmount,
			HasBid:           hasBid,
		})
	}

	latestWinnerName := "-"
	latestInterest := 0.0
	latestWinnerNumber := 0
	if isUsingSheets {
		for _, m := range allMembers {
			if m.HasReceivedShare && m.ReceivedMonth == month && m.ReceivedYear == year {
				latestWinnerName = m.Name
				latestInterest = m.InterestAmount
				latestWinnerNumber = winnerNumberMap[m.ID]
				break
			}
		}
	} else {
		var latestWinner Member
		err := DB.Where("has_received_share = ? AND received_month = ? AND received_year = ?", true, month, year).First(&latestWinner).Error
		if err == nil {
			latestWinnerName = latestWinner.Name
			latestInterest = latestWinner.InterestAmount
			latestWinnerNumber = winnerNumberMap[latestWinner.ID]
		}
	}

	// Thai month names helper
	thaiMonths := []string{
		"มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
		"กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
	}

	// Calculate yearly summary report
	var yearlySummaries []MonthSummary
	var yearlyTotalPrincipal float64 = 0
	var yearlyTotalInterest float64 = 0
	var yearlyTotalCollected float64 = 0

	memberLookup := make(map[uint]Member)
	for _, m := range allMembers {
		memberLookup[m.ID] = m
	}

	for mIdx := 1; mIdx <= 12; mIdx++ {
		monthName := thaiMonths[mIdx-1]
		pCount := 0
		principal := 0.0
		interest := 0.0
		total := 0.0

		for _, p := range allPayments {
			if p.Month == mIdx && p.Year == year {
				m, exists := memberLookup[p.MemberID]
				if !exists {
					continue
				}
				isDead := m.HasReceivedShare && (m.ReceivedYear < year || (m.ReceivedYear == year && m.ReceivedMonth <= mIdx))
				if p.Paid {
					pCount++
					principal += setting.MonthlyAmount
					if isDead {
						interest += m.InterestAmount
						total += setting.MonthlyAmount + m.InterestAmount
					} else {
						total += setting.MonthlyAmount
					}
				}
			}
		}

		yearlySummaries = append(yearlySummaries, MonthSummary{
			MonthName:      monthName,
			PaidCount:      pCount,
			TotalMembers:   len(allMembers),
			PrincipalMoney: principal,
			InterestMoney:  interest,
			TotalMoney:     total,
		})

		yearlyTotalPrincipal += principal
		yearlyTotalInterest += interest
		yearlyTotalCollected += total
	}

	// Calculate auction status
	auctionNotStarted := false
	auctionClosed := false
	auctionStartStr := ""
	auctionDeadlineStr := ""
	nowThai := getCurrentThailandTime()

	if setting.AuctionStart != nil {
		auctionStartStr = setting.AuctionStart.Format(time.RFC3339)
		if nowThai.Before(*setting.AuctionStart) {
			auctionNotStarted = true
		}
	}
	if setting.AuctionDeadline != nil {
		auctionDeadlineStr = setting.AuctionDeadline.Format(time.RFC3339)
		if nowThai.After(*setting.AuctionDeadline) {
			auctionClosed = true
		}
	}

	noBidsAtAll := (len(monthBids) == 0)

	// Populate Member objects in monthBids using memberLookup
	for i := range monthBids {
		if m, exists := memberLookup[monthBids[i].MemberID]; exists {
			monthBids[i].Member = m
		}
	}

	// Sort monthBids descending by Amount (Tie breaker: CreatedAt oldest first)
	sort.Slice(monthBids, func(i, j int) bool {
		if monthBids[i].Amount != monthBids[j].Amount {
			return monthBids[i].Amount > monthBids[j].Amount
		}
		return monthBids[i].CreatedAt.Before(monthBids[j].CreatedAt)
	})

	c.HTML(http.StatusOK, "index.html", gin.H{
		"Rows":                 rows,
		"TotalMembers":         len(allMembers),
		"PaidCount":            paidCount,
		"UnpaidCount":          unpaidCount,
		"CollectedMoney":       collectedMoney,
		"LatestWinnerName":     latestWinnerName,
		"LatestInterest":       latestInterest,
		"LatestWinnerNumber":   latestWinnerNumber,
		"Month":                month,
		"Year":                 year,
		"Search":               search,
		"Setting":              setting,
		"ThaiMonthName":        thaiMonths[month-1],
		"ThaiMonths":           thaiMonths,
		"IsAdmin":              isAdmin(c),
		"AlertMsg":             alertMsg,
		"AlertErr":             alertErr,
		"YearlySummaries":      yearlySummaries,
		"YearlyTotalPrincipal": yearlyTotalPrincipal,
		"YearlyTotalInterest":  yearlyTotalInterest,
		"YearlyTotalCollected": yearlyTotalCollected,
		"AuctionNotStarted":    auctionNotStarted,
		"AuctionClosed":        auctionClosed,
		"AuctionStartStr":      auctionStartStr,
		"AuctionDeadlineStr":   auctionDeadlineStr,
		"NoBidsAtAll":          noBidsAtAll,
		"Bids":                 monthBids,
	})
}

// AddMemberHandler handles POST /member/add
func AddMemberHandler(c *gin.Context) {
	if !isAdmin(c) {
		c.Redirect(http.StatusSeeOther, "/?error=unauthorized")
		return
	}
	name := c.PostForm("name")
	phone := c.PostForm("phone")
	bidPassword := c.PostForm("bid_password")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ชื่อสมาชิกห้ามว่าง"})
		return
	}

	if getSheetsURL() != "" {
		if err := addMemberSheets(name, phone, bidPassword); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member to Google Sheets"})
			return
		}
		c.Redirect(http.StatusSeeOther, "/")
		return
	}

	newMember := Member{
		Name:             name,
		Phone:            phone,
		BidPassword:      bidPassword,
		HasReceivedShare: false,
		InterestAmount:   0,
		CreatedAt:        time.Now(),
	}

	if err := DB.Create(&newMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
		return
	}

	// Auto-create payment for current month
	now := time.Now()
	payment := Payment{
		MemberID: newMember.ID,
		Month:    int(now.Month()),
		Year:     now.Year(),
		Paid:     false,
	}
	DB.Create(&payment)

	c.Redirect(http.StatusSeeOther, "/")
}

// UpdateMemberHandler handles POST /member/update
func UpdateMemberHandler(c *gin.Context) {
	if !isAdmin(c) {
		c.Redirect(http.StatusSeeOther, "/?error=unauthorized")
		return
	}
	idStr := c.PostForm("id")
	name := c.PostForm("name")
	phone := c.PostForm("phone")
	bidPassword := c.PostForm("bid_password")
	hasReceivedShareStr := c.PostForm("has_received_share")
	interestAmountStr := c.PostForm("interest_amount")

	receivedMonthStr := c.PostForm("received_month")
	receivedYearStr := c.PostForm("received_year")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสสมาชิกไม่ถูกต้อง"})
		return
	}

	if getSheetsURL() != "" {
		allM, _, _, _, err := fetchSheetsData()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch from Google Sheets"})
			return
		}
		var member Member
		found := false
		for _, m := range allM {
			if m.ID == uint(id) {
				member = m
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลสมาชิก"})
			return
		}

		member.Name = name
		member.Phone = phone
		member.BidPassword = bidPassword
		member.HasReceivedShare = (hasReceivedShareStr == "true" || hasReceivedShareStr == "on")
		
		if member.HasReceivedShare {
			if interest, err := strconv.ParseFloat(interestAmountStr, 64); err == nil {
				member.InterestAmount = interest
			} else {
				member.InterestAmount = 0
			}
			if rMonth, err := strconv.Atoi(receivedMonthStr); err == nil {
				member.ReceivedMonth = rMonth
			}
			if rYear, err := strconv.Atoi(receivedYearStr); err == nil {
				member.ReceivedYear = rYear
			}
		} else {
			member.InterestAmount = 0
			member.ReceivedMonth = 0
			member.ReceivedYear = 0
		}

		if err := updateMemberSheets(member); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update Google Sheets"})
			return
		}
		c.Redirect(http.StatusSeeOther, "/")
		return
	}

	var member Member
	if err := DB.First(&member, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลสมาชิก"})
		return
	}

	member.Name = name
	member.Phone = phone
	member.BidPassword = bidPassword
	member.HasReceivedShare = (hasReceivedShareStr == "true" || hasReceivedShareStr == "on")
	
	if member.HasReceivedShare {
		if interest, err := strconv.ParseFloat(interestAmountStr, 64); err == nil {
			member.InterestAmount = interest
		} else {
			member.InterestAmount = 0
		}
		if rMonth, err := strconv.Atoi(receivedMonthStr); err == nil {
			member.ReceivedMonth = rMonth
		}
		if rYear, err := strconv.Atoi(receivedYearStr); err == nil {
			member.ReceivedYear = rYear
		}
	} else {
		member.InterestAmount = 0
		member.ReceivedMonth = 0
		member.ReceivedYear = 0
	}

	DB.Save(&member)
	c.Redirect(http.StatusSeeOther, "/")
}

// DeleteMemberHandler handles POST /member/delete
func DeleteMemberHandler(c *gin.Context) {
	if !isAdmin(c) {
		c.Redirect(http.StatusSeeOther, "/?error=unauthorized")
		return
	}
	idStr := c.PostForm("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสสมาชิกไม่ถูกต้อง"})
		return
	}

	if getSheetsURL() != "" {
		if err := deleteMemberSheets(uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete from Google Sheets"})
			return
		}
		c.Redirect(http.StatusSeeOther, "/")
		return
	}

	// Delete related payments and then the member
	DB.Where("member_id = ?", id).Delete(&Payment{})
	DB.Delete(&Member{}, id)

	c.Redirect(http.StatusSeeOther, "/")
}

// SaveWinnerHandler handles POST /winner/save
func SaveWinnerHandler(c *gin.Context) {
	if !isAdmin(c) {
		c.Redirect(http.StatusSeeOther, "/?error=unauthorized")
		return
	}
	memberIDStr := c.PostForm("member_id")
	interestAmountStr := c.PostForm("interest_amount")

	memberID, err := strconv.ParseUint(memberIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสสมาชิกไม่ถูกต้อง"})
		return
	}

	interest, _ := strconv.ParseFloat(interestAmountStr, 64)
	monthStr := c.PostForm("month")
	yearStr := c.PostForm("year")
	
	now := time.Now()
	month := int(now.Month())
	year := now.Year()
	if mVal, err := strconv.Atoi(monthStr); err == nil && mVal >= 1 && mVal <= 12 {
		month = mVal
	}
	if yVal, err := strconv.Atoi(yearStr); err == nil && yVal >= 2000 {
		year = yVal
	}

	if getSheetsURL() != "" {
		allM, _, _, _, err := fetchSheetsData()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch from Google Sheets"})
			return
		}
		var member Member
		found := false
		for _, m := range allM {
			if m.ID == uint(memberID) {
				member = m
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลสมาชิก"})
			return
		}

		member.HasReceivedShare = true
		member.InterestAmount = interest
		member.ReceivedMonth = month
		member.ReceivedYear = year

		if err := updateMemberSheets(member); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save winner to Google Sheets"})
			return
		}
		c.Redirect(http.StatusSeeOther, "/?month="+strconv.Itoa(month)+"&year="+strconv.Itoa(year))
		return
	}

	var member Member
	if err := DB.First(&member, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลสมาชิก"})
		return
	}

	member.HasReceivedShare = true
	member.InterestAmount = interest
	member.ReceivedMonth = month
	member.ReceivedYear = year
	DB.Save(&member)

	c.Redirect(http.StatusSeeOther, "/?month="+strconv.Itoa(month)+"&year="+strconv.Itoa(year))
}

// TogglePaymentHandler handles POST /payment/toggle
func TogglePaymentHandler(c *gin.Context) {
	if !isAdmin(c) {
		c.Redirect(http.StatusSeeOther, "/?error=unauthorized")
		return
	}
	memberIDStr := c.PostForm("member_id")
	monthStr := c.PostForm("month")
	yearStr := c.PostForm("year")

	memberID, err := strconv.ParseUint(memberIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสสมาชิกไม่ถูกต้อง"})
		return
	}

	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)

	if getSheetsURL() != "" {
		if err := togglePaymentSheets(uint(memberID), month, year); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle payment on Google Sheets"})
			return
		}
		c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr)
		return
	}

	var payment Payment
	err = DB.Where("member_id = ? AND month = ? AND year = ?", memberID, month, year).First(&payment).Error
	now := getCurrentThailandTime()
	if err != nil {
		// Create new payment
		payment = Payment{
			MemberID: uint(memberID),
			Month:    month,
			Year:     year,
			Paid:     true,
			PaidDate: &now,
		}
		DB.Create(&payment)
	} else {
		// Toggle
		payment.Paid = !payment.Paid
		if payment.Paid {
			payment.PaidDate = &now
		} else {
			payment.PaidDate = nil
		}
		DB.Save(&payment)
	}

	c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr)
}

// UpdateSettingsHandler handles POST /settings/update
func UpdateSettingsHandler(c *gin.Context) {
	if !isAdmin(c) {
		c.Redirect(http.StatusSeeOther, "/?error=unauthorized")
		return
	}
	monthlyAmountStr := c.PostForm("monthly_amount")
	monthlyAmount, err := strconv.ParseFloat(monthlyAmountStr, 64)
	if err != nil || monthlyAmount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนเงินส่งรายเดือนไม่ถูกต้อง"})
		return
	}

	startStr := c.PostForm("auction_start")
	var start *time.Time = nil
	if startStr != "" {
		loc, _ := time.LoadLocation("Asia/Bangkok")
		if t, err := time.ParseInLocation("2006-01-02T15:04", startStr, loc); err == nil {
			start = &t
		} else {
			if t, err := time.Parse("2006-01-02T15:04", startStr); err == nil {
				tThai := t.Add(-7 * time.Hour)
				start = &tThai
			}
		}
	}

	deadlineStr := c.PostForm("auction_deadline")
	var deadline *time.Time = nil
	if deadlineStr != "" {
		loc, _ := time.LoadLocation("Asia/Bangkok")
		if t, err := time.ParseInLocation("2006-01-02T15:04", deadlineStr, loc); err == nil {
			deadline = &t
		} else {
			if t, err := time.Parse("2006-01-02T15:04", deadlineStr); err == nil {
				tThai := t.Add(-7 * time.Hour)
				deadline = &tThai
			}
		}
	}

	if getSheetsURL() != "" {
		if err := updateSettingsSheets(monthlyAmount, start, deadline); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings on Google Sheets"})
			return
		}
		c.Redirect(http.StatusSeeOther, "/")
		return
	}

	var setting Setting
	if err := DB.First(&setting, 1).Error; err != nil {
		setting = Setting{ID: 1, MonthlyAmount: monthlyAmount, AuctionStart: start, AuctionDeadline: deadline, UpdatedAt: time.Now()}
		DB.Create(&setting)
	} else {
		setting.MonthlyAmount = monthlyAmount
		setting.AuctionStart = start
		setting.AuctionDeadline = deadline
		setting.UpdatedAt = time.Now()
		DB.Save(&setting)
	}

	c.Redirect(http.StatusSeeOther, "/")
}

// Helper to check if logged in as admin
func isAdmin(c *gin.Context) bool {
	val, err := c.Cookie("admin_session")
	return err == nil && val == "authorized_admin_key_2026"
}

// LoginHandler handles POST /login
func LoginHandler(c *gin.Context) {
	username := c.PostForm("username")
	password := c.PostForm("password")
	if username == "admin" && password == "admin" {
		// Set cookie for 1 hour
		c.SetCookie("admin_session", "authorized_admin_key_2026", 3600, "/", "", false, true)
		c.Redirect(http.StatusSeeOther, "/?msg=login_success")
	} else {
		c.Redirect(http.StatusSeeOther, "/?error=login_failed")
	}
}

// LogoutHandler handles GET /logout
func LogoutHandler(c *gin.Context) {
	c.SetCookie("admin_session", "", -1, "/", "", false, true)
	c.Redirect(http.StatusSeeOther, "/?msg=logout_success")
}

// ResetPaymentHandler handles POST /payment/reset
func ResetPaymentHandler(c *gin.Context) {
	if !isAdmin(c) {
		c.Redirect(http.StatusSeeOther, "/?error=unauthorized")
		return
	}
	monthStr := c.PostForm("month")
	yearStr := c.PostForm("year")
	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)

	if getSheetsURL() != "" {
		if err := resetPaymentSheets(month, year); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset payments on Google Sheets"})
			return
		}
		c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&msg=reset_success")
		return
	}

	// Delete all payments for this month/year
	DB.Where("month = ? AND year = ?", month, year).Delete(&Payment{})

	c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&msg=reset_success")
}

// Helper to get current time in Thailand (Bangkok) location
func getCurrentThailandTime() time.Time {
	loc, err := time.LoadLocation("Asia/Bangkok")
	if err == nil {
		return time.Now().In(loc)
	}
	// Fallback to manual UTC + 7 offset
	return time.Now().UTC().Add(7 * time.Hour)
}

// SubmitBidHandler handles POST /member/bid
func SubmitBidHandler(c *gin.Context) {
	memberIDStr := c.PostForm("member_id")
	pin := c.PostForm("pin")
	amountStr := c.PostForm("amount")
	monthStr := c.PostForm("month")
	yearStr := c.PostForm("year")

	memberID, err := strconv.ParseUint(memberIDStr, 10, 32)
	if err != nil {
		c.Redirect(http.StatusSeeOther, "/?error=invalid_member")
		return
	}

	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)
	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil || amount < 0 {
		c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=invalid_bid_amount")
		return
	}

	// 1. Fetch setting and verify deadline
	var setting Setting
	isUsingSheets := (getSheetsURL() != "")
	if isUsingSheets {
		_, _, _, s, err := fetchSheetsData()
		if err == nil {
			setting = s
		}
	} else {
		DB.First(&setting, 1)
	}

	nowThai := getCurrentThailandTime()
	if setting.AuctionStart != nil {
		if nowThai.Before(*setting.AuctionStart) {
			c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=bid_not_started")
			return
		}
	}
	if setting.AuctionDeadline != nil {
		if nowThai.After(*setting.AuctionDeadline) {
			c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=bid_deadline_passed")
			return
		}
	}

	// 2. Fetch member and verify pin
	var member Member
	if isUsingSheets {
		allM, _, _, _, err := fetchSheetsData()
		if err != nil {
			c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=db_error")
			return
		}
		found := false
		for _, m := range allM {
			if m.ID == uint(memberID) {
				member = m
				found = true
				break
			}
		}
		if !found {
			c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=member_not_found")
			return
		}
	} else {
		if err := DB.First(&member, memberID).Error; err != nil {
			c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=member_not_found")
			return
		}
	}

	// Verify password
	if member.BidPassword != pin {
		c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=invalid_pin")
		return
	}

	// Member cannot bid if they already received the share!
	if member.HasReceivedShare {
		c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=already_received")
		return
	}

	// 3. Save the bid
	if isUsingSheets {
		if err := submitBidSheets(uint(memberID), month, year, amount); err != nil {
			c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&error=save_error")
			return
		}
	} else {
		var bid Bid
		err := DB.Where("member_id = ? AND month = ? AND year = ?", memberID, month, year).First(&bid).Error
		if err == nil {
			bid.Amount = amount
			DB.Save(&bid)
		} else {
			DB.Create(&Bid{
				MemberID: uint(memberID),
				Month:    month,
				Year:     year,
				Amount:   amount,
				CreatedAt: getCurrentThailandTime(),
			})
		}
	}

	c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&msg=bid_success")
}
