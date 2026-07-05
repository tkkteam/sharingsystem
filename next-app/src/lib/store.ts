import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const DB_FILE = join(DATA_DIR, "db.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export interface MemberRecord {
  ID: number;
  Name: string;
  Phone: string;
  BidPassword: string;
  HasReceivedShare: boolean;
  InterestAmount: number;
  ReceivedMonth: number;
  ReceivedYear: number;
  CreatedAt: string;
}

export interface PaymentRecord {
  ID: number;
  MemberID: number;
  Month: number;
  Year: number;
  Paid: boolean;
  PaidDate: string | null;
}

export interface BidRecord {
  ID: number;
  MemberID: number;
  Month: number;
  Year: number;
  Amount: number;
  CreatedAt: string;
}

export interface SettingsRecord {
  ID: number;
  MonthlyAmount: number;
  AuctionStart: string | null;
  AuctionDeadline: string | null;
  UpdatedAt: string;
}

export interface DB {
  nextMemberId: number;
  nextPaymentId: number;
  nextBidId: number;
  members: MemberRecord[];
  payments: PaymentRecord[];
  bids: BidRecord[];
  settings: SettingsRecord;
}

function defaultDB(): DB {
  return {
    nextMemberId: 1,
    nextPaymentId: 1,
    nextBidId: 1,
    members: [],
    payments: [],
    bids: [],
    settings: {
      ID: 1,
      MonthlyAmount: 1000,
      AuctionStart: null,
      AuctionDeadline: null,
      UpdatedAt: new Date().toISOString(),
    },
  };
}

let _cache: DB | undefined;

export function loadDB(): DB {
  if (_cache) return _cache;
  ensureDir();
  if (existsSync(DB_FILE)) {
    try {
      const raw = readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw) as DB;
      _cache = parsed;
      return parsed;
    } catch {
      const def = defaultDB();
      _cache = def;
      return def;
    }
  }
  const def = defaultDB();
  _cache = def;
  return def;
}

export function saveDB(db: DB) {
  ensureDir();
  _cache = db;
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export function generateBidPassword(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
