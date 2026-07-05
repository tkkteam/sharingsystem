import { query, withTransaction } from "./db";

export interface GMember {
  id: number;
  name: string;
  phone: string;
  has_received_share: boolean;
  interest_amount: number;
  received_month: number;
  received_year: number;
  created_at: string;
  bid_password: string;
  first_name?: string;
  last_name?: string;
  bank_name?: string;
  account_number?: string;
}

export interface GPayment {
  id: number;
  member_id: number;
  month: number;
  year: number;
  paid: boolean;
  paid_date: string | null;
}

export interface GBid {
  id: number;
  member_id: number;
  month: number;
  year: number;
  amount: number;
  created_at: string;
}

export interface GSlip {
  id: number;
  member_id: number;
  month: number;
  year: number;
  file_name: string;
  uploaded_at: string;
}

export interface GASetting {
  MonthlyAmount: number;
  AuctionStart: string | null;
  AuctionDeadline: string | null;
  AuctionActive: boolean | null;
}

interface MemberRow {
  id: number;
  name: string;
  phone: string;
  has_received_share: boolean;
  interest_amount: number;
  received_month: number;
  received_year: number;
  created_at: Date;
  bid_password: string;
  first_name?: string;
  last_name?: string;
  bank_name?: string;
  account_number?: string;
}

interface PaymentRow {
  id: number;
  member_id: number;
  month: number;
  year: number;
  paid: boolean;
  paid_date: Date | null;
}

interface BidRow {
  id: number;
  member_id: number;
  month: number;
  year: number;
  amount: number;
  created_at: Date;
}

interface SettingRow {
  monthly_amount: number;
  auction_start: string | null;
  auction_deadline: string | null;
  auction_active: boolean;
}

export async function fetchGASData(): Promise<{
  members: GMember[];
  payments: GPayment[];
  bids: GBid[];
  setting: GASetting;
}> {
  const [memberRows, paymentRows, bidRows, settingRows] = await Promise.all([
    query<MemberRow>("SELECT * FROM members ORDER BY id"),
    query<PaymentRow>("SELECT * FROM payments ORDER BY id"),
    query<BidRow>("SELECT * FROM bids ORDER BY id"),
    query<SettingRow>("SELECT * FROM settings WHERE id = 1"),
  ]);

  const members: GMember[] = memberRows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    has_received_share: r.has_received_share,
    interest_amount: r.interest_amount,
    received_month: r.received_month,
    received_year: r.received_year,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    bid_password: r.bid_password,
    first_name: r.first_name || "",
    last_name: r.last_name || "",
    bank_name: r.bank_name || "",
    account_number: r.account_number || "",
  }));

  const payments: GPayment[] = paymentRows.map((r) => ({
    id: r.id,
    member_id: r.member_id,
    month: r.month,
    year: r.year,
    paid: r.paid,
    paid_date: r.paid_date instanceof Date ? r.paid_date.toISOString() : r.paid_date ? String(r.paid_date) : null,
  }));

  const bids: GBid[] = bidRows.map((r) => ({
    id: r.id,
    member_id: r.member_id,
    month: r.month,
    year: r.year,
    amount: r.amount,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));

  const s = settingRows[0] || {
    monthly_amount: 1000,
    auction_start: null,
    auction_deadline: null,
    auction_active: true,
  };

  const setting: GASetting = {
    MonthlyAmount: s.monthly_amount,
    AuctionStart: s.auction_start,
    AuctionDeadline: s.auction_deadline,
    AuctionActive: s.auction_active,
  };

  return { members, payments, bids, setting };
}

type GASResponse = Record<string, unknown> | { success: boolean; error?: string };

export async function callGAS(action: string, data: Record<string, unknown>): Promise<GASResponse> {
  switch (action) {
    case "add_member":
      return addMemberRecord(data);
    case "update_member":
      return updateMemberRecord(data);
    case "delete_member":
      return deleteMemberRecord(data);
    case "submit_bid":
      return submitBidRecord(data);
    case "delete_bid":
      return deleteBidRecord(data);
    case "toggle_payment":
      return togglePaymentRecord(data);
    case "reset_payment":
      return resetPaymentRecord(data);
    case "update_settings":
      return updateSettingsRecord(data);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function addMemberRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const name = String(data.name ?? "");
  const phone = String(data.phone ?? "");
  const bid_password = String(data.bid_password ?? "1234");

  const rows = await query<{ id: number }>(
    `INSERT INTO members (name, phone, bid_password)
     VALUES ($1, $2, $3) RETURNING id`,
    [name, phone, bid_password]
  );
  return { success: true, id: rows[0]?.id };
}

async function updateMemberRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const id = Number(data.id);
  if (!id) throw new Error("Member id is required for update");

  await withTransaction(async (client) => {
    // Fetch current values to merge partial updates
    const cur = await client.query<{
      name: string;
      phone: string;
      bid_password: string;
      first_name: string;
      last_name: string;
      bank_name: string;
      account_number: string;
      has_received_share: boolean;
      interest_amount: number;
      received_month: number;
      received_year: number;
    }>("SELECT name, phone, bid_password, first_name, last_name, bank_name, account_number, has_received_share, interest_amount, received_month, received_year FROM members WHERE id = $1", [id]);

    if (cur.rows.length === 0) throw new Error("Member not found");
    const c = cur.rows[0];

    const name = data.name !== undefined ? String(data.name) : c.name;
    const phone = data.phone !== undefined ? String(data.phone) : c.phone;
    const bid_password = data.bid_password !== undefined ? String(data.bid_password) : c.bid_password;
    const first_name = data.first_name !== undefined ? String(data.first_name) : c.first_name;
    const last_name = data.last_name !== undefined ? String(data.last_name) : c.last_name;
    const bank_name = data.bank_name !== undefined ? String(data.bank_name) : c.bank_name;
    const account_number = data.account_number !== undefined ? String(data.account_number) : c.account_number;
    const has_received_share = data.has_received_share !== undefined ? Boolean(data.has_received_share) : c.has_received_share;
    const interest_amount = data.interest_amount !== undefined ? Number(data.interest_amount) : c.interest_amount;
    const received_month = data.received_month !== undefined ? Number(data.received_month) : c.received_month;
    const received_year = data.received_year !== undefined ? Number(data.received_year) : c.received_year;

    await client.query(
      `UPDATE members
       SET name = $1, phone = $2, bid_password = $3,
           first_name = $4, last_name = $5, bank_name = $6, account_number = $7,
           has_received_share = $8, interest_amount = $9,
           received_month = $10, received_year = $11
       WHERE id = $12`,
      [name, phone, bid_password, first_name, last_name, bank_name, account_number, has_received_share, interest_amount, received_month, received_year, id]
    );
  });

  return { success: true };
}

async function deleteMemberRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const id = Number(data.id);
  if (!id) throw new Error("Member id is required for delete");
  await query("DELETE FROM members WHERE id = $1", [id]);
  return { success: true };
}

async function submitBidRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const member_id = Number(data.member_id);
  const month = Number(data.month);
  const year = Number(data.year);
  const amount = Number(data.amount);

  const rows = await query<{ id: number }>(
    `INSERT INTO bids (member_id, month, year, amount)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [member_id, month, year, amount]
  );
  return { success: true, id: rows[0]?.id };
}

async function deleteBidRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const member_id = Number(data.member_id);
  const month = Number(data.month);
  const year = Number(data.year);
  await query(
    "DELETE FROM bids WHERE member_id = $1 AND month = $2 AND year = $3",
    [member_id, month, year]
  );
  return { success: true };
}

async function togglePaymentRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const member_id = Number(data.member_id);
  const month = Number(data.month);
  const year = Number(data.year);

  await withTransaction(async (client) => {
    const cur = await client.query<{ paid: boolean }>(
      "SELECT paid FROM payments WHERE member_id = $1 AND month = $2 AND year = $3",
      [member_id, month, year]
    );

    const newPaid = cur.rows.length === 0 ? true : !cur.rows[0].paid;
    const paidDate = newPaid ? new Date().toISOString() : null;

    if (cur.rows.length === 0) {
      await client.query(
        `INSERT INTO payments (member_id, month, year, paid, paid_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [member_id, month, year, newPaid, paidDate]
      );
    } else {
      await client.query(
        "UPDATE payments SET paid = $1, paid_date = $2 WHERE member_id = $3 AND month = $4 AND year = $5",
        [newPaid, paidDate, member_id, month, year]
      );
    }
  });

  return { success: true };
}

async function resetPaymentRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const month = Number(data.month);
  const year = Number(data.year);
  await query("DELETE FROM payments WHERE month = $1 AND year = $2", [month, year]);
  return { success: true };
}

async function updateSettingsRecord(data: Record<string, unknown>): Promise<GASResponse> {
  const monthly_amount = Number(data.monthly_amount ?? 1000);
  const auction_start = (data.start as string | null) ?? null;
  const auction_deadline = (data.deadline as string | null) ?? null;
  const auction_active = data.active !== undefined ? Boolean(data.active) : true;

  await query(
    `UPDATE settings
     SET monthly_amount = $1, auction_start = $2, auction_deadline = $3,
         auction_active = $4, updated_at = NOW()
     WHERE id = 1`,
    [monthly_amount, auction_start, auction_deadline, auction_active]
  );

  return { success: true };
}

// ============ SLIP FUNCTIONS ============

interface SlipRow {
  id: number;
  member_id: number;
  month: number;
  year: number;
  file_name: string;
  uploaded_at: Date;
}

/**
 * Fetch all slip records. Used to build a map for index data.
 */
export async function fetchAllSlips(): Promise<GSlip[]> {
  const rows = await query<SlipRow>("SELECT * FROM slips ORDER BY id");
  return rows.map((r) => ({
    id: r.id,
    member_id: r.member_id,
    month: r.month,
    year: r.year,
    file_name: r.file_name,
    uploaded_at: r.uploaded_at instanceof Date ? r.uploaded_at.toISOString() : String(r.uploaded_at),
  }));
}

/**
 * Save (or replace) a slip record for a member/month/year.
 */
export async function saveSlipRecord(memberId: number, month: number, year: number, fileName: string): Promise<GSlip> {
  const rows = await query<SlipRow>(
    `INSERT INTO slips (member_id, month, year, file_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (member_id, month, year)
     DO UPDATE SET file_name = EXCLUDED.file_name, uploaded_at = NOW()
     RETURNING *`,
    [memberId, month, year, fileName]
  );
  const r = rows[0];
  return {
    id: r.id,
    member_id: r.member_id,
    month: r.month,
    year: r.year,
    file_name: r.file_name,
    uploaded_at: r.uploaded_at instanceof Date ? r.uploaded_at.toISOString() : String(r.uploaded_at),
  };
}

/**
 * Get a single slip record (for admin to view the file).
 */
export async function getSlipRecord(memberId: number, month: number, year: number): Promise<GSlip | null> {
  const rows = await query<SlipRow>(
    "SELECT * FROM slips WHERE member_id = $1 AND month = $2 AND year = $3",
    [memberId, month, year]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    member_id: r.member_id,
    month: r.month,
    year: r.year,
    file_name: r.file_name,
    uploaded_at: r.uploaded_at instanceof Date ? r.uploaded_at.toISOString() : String(r.uploaded_at),
  };
}

/**
 * Delete a slip record.
 */
export async function deleteSlipRecord(memberId: number, month: number, year: number): Promise<void> {
  await query(
    "DELETE FROM slips WHERE member_id = $1 AND month = $2 AND year = $3",
    [memberId, month, year]
  );
}
