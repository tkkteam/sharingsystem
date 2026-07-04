package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// MemberRow structures the row data for frontend table
type MemberRow struct {
	Member           Member
	Payment          Payment
	NextPaymentValue float64
	WinnerNumber     int
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
	}

	var alertErr string
	if errMsg == "login_failed" {
		alertErr = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"
	} else if errMsg == "unauthorized" {
		alertErr = "เกิดข้อผิดพลาด: สิทธิ์การใช้งานนี้ถูกจำกัดเฉพาะผู้ดูแลระบบ (Admin) เท่านั้น!"
	}

	// Fetch current setting
	var setting Setting
	if err := DB.First(&setting, 1).Error; err != nil {
		setting = Setting{MonthlyAmount: 1000}
	}

	// Ensure payments exist for all members for this month/year
	var allMembers []Member
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

	// Fetch members matching search (or all)
	var members []Member
	if search != "" {
		DB.Where("name LIKE ? OR phone LIKE ?", "%"+search+"%", "%"+search+"%").Find(&members)
	} else {
		DB.Find(&members)
	}

	// Fetch all payments for this month/year
	var payments []Payment
	DB.Where("month = ? AND year = ?", month, year).Find(&payments)

	// Map payments by MemberID for fast lookup
	paymentMap := make(map[uint]Payment)
	for _, p := range payments {
		paymentMap[p.MemberID] = p
	}

	// Fetch all winners sorted chronologically to determine their sequence number
	var winners []Member
	DB.Where("has_received_share = ?", true).Order("received_year asc, received_month asc, id asc").Find(&winners)
	winnerNumberMap := make(map[uint]int)
	for idx, w := range winners {
		winnerNumberMap[w.ID] = idx + 1
	}

	// Build rows and calculate stats over all members (for accuracy)
	var rows []MemberRow
	var paidCount int64 = 0
	var unpaidCount int64 = 0
	var collectedMoney float64 = 0

	var totalPayments []Payment
	DB.Preload("Member").Where("month = ? AND year = ?", month, year).Find(&totalPayments)
	for _, p := range totalPayments {
		isDead := p.Member.HasReceivedShare && (p.Member.ReceivedYear < year || (p.Member.ReceivedYear == year && p.Member.ReceivedMonth <= month))
		if p.Paid {
			paidCount++
			if isDead {
				collectedMoney += setting.MonthlyAmount + p.Member.InterestAmount
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

		rows = append(rows, MemberRow{
			Member:           m,
			Payment:          payment,
			NextPaymentValue: nextPayment,
			WinnerNumber:     winnerNum,
		})
	}

	// Fetch recipient of share for the selected month/year
	var latestWinner Member
	err := DB.Where("has_received_share = ? AND received_month = ? AND received_year = ?", true, month, year).First(&latestWinner).Error
	latestWinnerName := "-"
	latestInterest := 0.0
	latestWinnerNumber := 0
	if err == nil {
		latestWinnerName = latestWinner.Name
		latestInterest = latestWinner.InterestAmount
		latestWinnerNumber = winnerNumberMap[latestWinner.ID]
	}

	// Thai month names helper
	thaiMonths := []string{
		"มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
		"กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
	}

	c.HTML(http.StatusOK, "index.html", gin.H{
		"Rows":               rows,
		"TotalMembers":       len(allMembers),
		"PaidCount":          paidCount,
		"UnpaidCount":        unpaidCount,
		"CollectedMoney":     collectedMoney,
		"LatestWinnerName":   latestWinnerName,
		"LatestInterest":     latestInterest,
		"LatestWinnerNumber": latestWinnerNumber,
		"Month":            month,
		"Year":             year,
		"Search":           search,
		"Setting":          setting,
		"ThaiMonthName":    thaiMonths[month-1],
		"ThaiMonths":       thaiMonths,
		"IsAdmin":            isAdmin(c),
		"AlertMsg":           alertMsg,
		"AlertErr":           alertErr,
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
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ชื่อสมาชิกห้ามว่าง"})
		return
	}

	newMember := Member{
		Name:             name,
		Phone:            phone,
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
	hasReceivedShareStr := c.PostForm("has_received_share")
	interestAmountStr := c.PostForm("interest_amount")

	receivedMonthStr := c.PostForm("received_month")
	receivedYearStr := c.PostForm("received_year")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสสมาชิกไม่ถูกต้อง"})
		return
	}

	var member Member
	if err := DB.First(&member, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลสมาชิก"})
		return
	}

	member.Name = name
	member.Phone = phone
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

	var member Member
	if err := DB.First(&member, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลสมาชิก"})
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

	var payment Payment
	err = DB.Where("member_id = ? AND month = ? AND year = ?", memberID, month, year).First(&payment).Error
	now := time.Now()
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

	var setting Setting
	if err := DB.First(&setting, 1).Error; err != nil {
		setting = Setting{ID: 1, MonthlyAmount: monthlyAmount, UpdatedAt: time.Now()}
		DB.Create(&setting)
	} else {
		setting.MonthlyAmount = monthlyAmount
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

	// Delete all payments for this month/year
	DB.Where("month = ? AND year = ?", month, year).Delete(&Payment{})

	c.Redirect(http.StatusSeeOther, "/?month="+monthStr+"&year="+yearStr+"&msg=reset_success")
}
