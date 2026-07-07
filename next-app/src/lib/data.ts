import { fetchGASData, callGAS, fetchAllSlips, saveSlipRecord, getSlipRecord, deleteSlipRecord, type GMember, type GPayment, type GBid } from "./gas-api";
import type { IndexData, MemberRow, MonthSummary, Bid, Setting, Member } from "./types";
import { THAI_MONTHS, parseThaiDate } from "./utils";
import { query } from "./db";

const THAI_ADMIN_PASS = process.env.ADMIN_USERNAME || "admin";
const THAI_ADMIN_PASSWD = process.env.ADMIN_PASSWORD || "admin";

export async function computeIndexData(month: number, year: number, search: string): Promise<IndexData> {
  const gasData = await fetchGASData();
  const members = gasData.members;
  const payments = gasData.payments;
  const bids = gasData.bids;
  const setting = gasData.setting;

  const paymentMap = new Map<string, GPayment>();
  for (const p of payments) {
    if (p.month === month && p.year === year) {
      paymentMap.set(String(p.member_id), p);
    }
  }

  // Fetch slips for this period and build a lookup map (memberId -> slip)
  const allSlips = await fetchAllSlips();
  const slipMap = new Map<string, typeof allSlips[0]>();
  for (const s of allSlips) {
    if (s.month === month && s.year === year) {
      slipMap.set(String(s.member_id), s);
    }
  }

  const bidMap = new Map<string, GBid[]>();
  for (const b of bids) {
    if (b.month === month && b.year === year) {
      const key = String(b.member_id);
      if (!bidMap.has(key)) bidMap.set(key, []);
      bidMap.get(key)!.push(b);
    }
  }

  // Determine auction status early so bid amounts can be hidden (sealed)
  // from the admin while the auction is still open.
  const auctionActive = setting.AuctionActive !== false;
  const auctionClosed = !auctionActive || (setting.AuctionDeadline ? new Date() >= (parseThaiDate(setting.AuctionDeadline) || new Date()) : false);

  // While the auction is open, sort bids by submission time (not amount) so the
  // array order does not leak the ranking to the admin. After close, rank by amount.
  const sortedBids = bids
    .filter((b) => b.month === month && b.year === year)
    .sort((a, b) =>
      auctionClosed
        ? b.amount - a.amount || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  let paidCount = 0;
  let unpaidCount = 0;
  let collectedMoney = 0;
  let latestWinnerName = "-";
  let latestWinnerNumber = 0;
  let latestInterest = 0;
  let winnerCounter = 0;

  const rows: MemberRow[] = members.map((m) => {
    const gPayment = paymentMap.get(String(m.id));
    const payment = gPayment
      ? { ID: gPayment.id, MemberID: gPayment.member_id, Month: gPayment.month, Year: gPayment.year, Paid: gPayment.paid, PaidDate: gPayment.paid_date }
      : { ID: 0, MemberID: m.id, Month: month, Year: year, Paid: false, PaidDate: null };

    const memberBids = bidMap.get(String(m.id)) || [];
    const hasBid = memberBids.length > 0;
    // Hide bid amount while auction is open (sealed bid). Only reveal after close.
    const bidAmount = hasBid && auctionClosed ? memberBids[0].amount : 0;

    let winnerNumber = 0;
    if (m.has_received_share) {
      winnerCounter++;
      winnerNumber = winnerCounter;
      latestWinnerName = m.name;
      latestWinnerNumber = winnerCounter;
      latestInterest = m.interest_amount;
    }

    if (payment.Paid) {
      paidCount++;
      collectedMoney += computeNextPayment(m, setting.MonthlyAmount, members);
    } else {
      unpaidCount++;
    }

    const nextPayment = computeNextPayment(m, setting.MonthlyAmount, members);

    const memberObj: Member = {
      ID: m.id,
      Name: m.name,
      Phone: m.phone,
      BidPassword: m.bid_password,
      FirstName: m.first_name || "",
      LastName: m.last_name || "",
      BankName: m.bank_name || "",
      AccountNumber: m.account_number || "",
      HasReceivedShare: m.has_received_share,
      InterestAmount: m.interest_amount,
      ReceivedMonth: m.received_month,
      ReceivedYear: m.received_year,
      CreatedAt: m.created_at,
    };

    return {
      Member: memberObj,
      Payment: payment,
      NextPaymentValue: nextPayment,
      WinnerNumber: winnerNumber,
      BidAmount: bidAmount,
      HasBid: hasBid,
      HasSlip: slipMap.has(String(m.id)),
      SlipFileName: slipMap.get(String(m.id))?.file_name || null,
    };
  });

  const filteredRows = search
    ? rows.filter(
        (r) =>
          r.Member.Name.toLowerCase().includes(search.toLowerCase()) ||
          (r.Member.Phone || "").toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const auctionNotStarted = auctionActive && setting.AuctionStart ? new Date() < (parseThaiDate(setting.AuctionStart) || new Date()) : false;
  const noBidsAtAll = sortedBids.length === 0 && auctionClosed;

  const yearlySummaries: MonthSummary[] = [];
  let yearlyPrincipal = 0;
  let yearlyInterest = 0;
  let yearlyTotal = 0;

  for (let m = 1; m <= 12; m++) {
    let monthPaid = 0;
    let monthPrincipal = 0;
    let monthInterest = 0;

    for (const mem of members) {
      const pmt = payments.find((p) => p.member_id === mem.id && p.month === m && p.year === year);
      if (pmt && pmt.paid) {
        monthPaid++;
        const principal = setting.MonthlyAmount;
        const interest = mem.has_received_share && mem.received_month === m && mem.received_year === year ? mem.interest_amount : 0;
        monthPrincipal += principal;
        monthInterest += interest;
      }
    }

    const total = monthPrincipal + monthInterest;
    yearlyPrincipal += monthPrincipal;
    yearlyInterest += monthInterest;
    yearlyTotal += total;

    yearlySummaries.push({
      MonthName: THAI_MONTHS[m - 1],
      PaidCount: monthPaid,
      TotalMembers: members.length,
      PrincipalMoney: monthPrincipal,
      InterestMoney: monthInterest,
      TotalMoney: total,
    });
  }

  const settingObj: Setting = {
    MonthlyAmount: setting.MonthlyAmount,
    AuctionStart: setting.AuctionStart,
    AuctionDeadline: setting.AuctionDeadline,
    AuctionActive: setting.AuctionActive !== false,
  };

  const bidList: Bid[] = sortedBids.map((b) => {
    const member = members.find((m) => m.id === b.member_id);
    return {
      ID: b.id,
      MemberID: b.member_id,
      Member: member ? {
        ID: member.id,
        Name: member.name,
        Phone: member.phone,
        BidPassword: member.bid_password,
        HasReceivedShare: member.has_received_share,
        InterestAmount: member.interest_amount,
        ReceivedMonth: member.received_month,
        ReceivedYear: member.received_year,
        CreatedAt: member.created_at,
      } : undefined,
      Month: b.month,
      Year: b.year,
      Amount: auctionClosed ? b.amount : 0,
      CreatedAt: b.created_at,
    };
  });

  return {
    Rows: filteredRows,
    TotalMembers: members.length,
    PaidCount: paidCount,
    UnpaidCount: unpaidCount,
    CollectedMoney: collectedMoney,
    LatestWinnerName: latestWinnerName,
    LatestInterest: latestInterest,
    LatestWinnerNumber: latestWinnerNumber,
    Month: month,
    Year: year,
    Search: search,
    Setting: settingObj,
    ThaiMonthName: THAI_MONTHS[month - 1] || "",
    ThaiMonths: THAI_MONTHS,
    IsAdmin: false,
    AlertMsg: "",
    AlertErr: "",
    YearlySummaries: yearlySummaries,
    YearlyTotalPrincipal: yearlyPrincipal,
    YearlyTotalInterest: yearlyInterest,
    YearlyTotalCollected: yearlyTotal,
    AuctionNotStarted: auctionNotStarted,
    AuctionClosed: auctionClosed,
    AuctionStartStr: setting.AuctionStart || "",
    AuctionDeadlineStr: setting.AuctionDeadline || "",
    NoBidsAtAll: noBidsAtAll,
    Bids: bidList,
  };
}

function computeNextPayment(member: GMember, monthlyAmount: number, allMembers: GMember[]): number {
  if (!member.has_received_share) return monthlyAmount;

  const receivedMembers = allMembers.filter(
    (m) => m.has_received_share && (m.received_year < member.received_year || (m.received_year === member.received_year && m.received_month <= member.received_month))
  );

  const basePrincipal = monthlyAmount;
  const totalInterest = member.interest_amount || 0;
  const perPersonInterest = receivedMembers.length > 1 ? Math.floor(totalInterest / (receivedMembers.length - 1)) : 0;

  return basePrincipal + perPersonInterest;
}

export function checkAdmin(username: string, password: string): boolean {
  return username === THAI_ADMIN_PASS && password === THAI_ADMIN_PASSWD;
}

export async function addMember(name: string, phone: string, bidPassword: string) {
  return callGAS("add_member", { name, phone, bid_password: bidPassword || "1234" });
}

export async function updateMember(
  id: number,
  name: string,
  phone: string,
  bidPassword: string,
  hasReceivedShare: boolean,
  interestAmount: number,
  receivedMonth: number,
  receivedYear: number,
  firstName?: string,
  lastName?: string,
  bankName?: string,
  accountNumber?: string
) {
  return callGAS("update_member", {
    id,
    name,
    phone,
    bid_password: bidPassword || "1234",
    has_received_share: hasReceivedShare,
    interest_amount: interestAmount,
    received_month: receivedMonth,
    received_year: receivedYear,
    first_name: firstName || "",
    last_name: lastName || "",
    bank_name: bankName || "",
    account_number: accountNumber || "",
  });
}

export async function deleteMember(id: number) {
  return callGAS("delete_member", { id });
}

export async function submitBid(memberId: number, month: number, year: number, amount: number, pin: string) {
  const gasData = await fetchGASData();
  const setting = gasData.setting;

  // Validate manual open/closed status
  if (setting.AuctionActive === false) {
    throw new Error("ระบบเสนอราคาประมูลแชร์ถูกปิดโดยแอดมิน");
  }

  // Validate auction timing
  const now = new Date();
  if (setting.AuctionStart) {
    const start = parseThaiDate(setting.AuctionStart);
    if (start && now < start) {
      throw new Error("ยังไม่เปิดให้เสนอราคาประมูลสำหรับงวดนี้");
    }
  }
  if (setting.AuctionDeadline) {
    const deadline = parseThaiDate(setting.AuctionDeadline);
    if (deadline && now >= deadline) {
      throw new Error("หมดเวลาเสนอราคาประมูลสำหรับงวดนี้แล้ว");
    }
  }

  const member = gasData.members.find((m) => m.id === memberId);
  if (!member) throw new Error("Member not found");
  if (member.bid_password !== pin) throw new Error("ใส่รหัสไม่ถูกต้อง ติดต่อ admin เพื่อขอรหัส");
  if (member.has_received_share) throw new Error("สมาชิกนี้ได้รับแชร์แล้ว");

  const existingBid = gasData.bids.find((b) => b.member_id === memberId && b.month === month && b.year === year);
  if (existingBid) throw new Error("คุณได้เสนอราคาในงวดนี้แล้ว");

  return callGAS("submit_bid", { member_id: memberId, month, year, amount });
}

export async function deleteBid(memberId: number, month: number, year: number) {
  return callGAS("delete_bid", { member_id: memberId, month, year });
}

export async function togglePayment(memberId: number, month: number, year: number) {
  const gasData = await fetchGASData();
  const pmt = gasData.payments.find((p) => p.member_id === memberId && p.month === month && p.year === year);
  const isPaidCurrently = pmt ? pmt.paid : false;

  const res = await callGAS("toggle_payment", { member_id: memberId, month, year });

  // If toggling from paid to unpaid, delete local slips and local payment record
  if (isPaidCurrently) {
    await deleteSlipRecord(memberId, month, year);
    await query(
      "DELETE FROM payments WHERE member_id = $1 AND month = $2 AND year = $3",
      [memberId, month, year]
    );
  }

  return res;
}

export async function resetPayments(month: number, year: number) {
  // Delete all local slips for this month/year
  await query("DELETE FROM slips WHERE month = $1 AND year = $2", [month, year]);

  // Delete all local payments (for virtual cash/transfer) for this month/year
  await query("DELETE FROM payments WHERE month = $1 AND year = $2", [month, year]);

  // Reset in GAS
  return callGAS("reset_payment", { month, year });
}

export async function saveWinner(memberId: number, interestAmount: number, month: number, year: number) {
  await callGAS("update_member", {
    id: memberId,
    has_received_share: true,
    interest_amount: interestAmount,
    received_month: month,
    received_year: year,
  });
}

export async function updateSettings(monthlyAmount: number, auctionStart: string | null, auctionDeadline: string | null, auctionActive: boolean) {
  return callGAS("update_settings", {
    monthly_amount: monthlyAmount,
    start: auctionStart,
    deadline: auctionDeadline,
    active: auctionActive,
  });
}

// ============ SLIP FUNCTIONS ============

export async function saveSlip(memberId: number, month: number, year: number, fileName: string) {
  return saveSlipRecord(memberId, month, year, fileName);
}

export async function getSlip(memberId: number, month: number, year: number) {
  return getSlipRecord(memberId, month, year);
}

export async function deleteSlip(memberId: number, month: number, year: number) {
  return deleteSlipRecord(memberId, month, year);
}

export async function adminPay(memberId: number, month: number, year: number, type: string) {
  // Save virtual slip record
  await saveSlipRecord(memberId, month, year, type);

  // Mark payment as paid
  await query(
    `INSERT INTO payments (member_id, month, year, paid, paid_date)
     VALUES ($1, $2, $3, TRUE, NOW())
     ON CONFLICT (member_id, month, year)
     DO UPDATE SET paid = TRUE, paid_date = NOW()`,
    [memberId, month, year]
  );
}
