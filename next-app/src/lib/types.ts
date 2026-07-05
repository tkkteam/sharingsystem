export interface Member {
  ID: number;
  Name: string;
  Phone: string;
  BidPassword: string;
  FirstName?: string;
  LastName?: string;
  BankName?: string;
  AccountNumber?: string;
  HasReceivedShare: boolean;
  InterestAmount: number;
  ReceivedMonth: number;
  ReceivedYear: number;
  CreatedAt: string;
}

export interface Payment {
  ID: number;
  MemberID: number;
  Member?: Member;
  Month: number;
  Year: number;
  Paid: boolean;
  PaidDate: string | null;
}

export interface Setting {
  ID?: number;
  MonthlyAmount: number;
  AuctionStart: string | null;
  AuctionDeadline: string | null;
  AuctionActive: boolean;
  UpdatedAt?: string;
}

export interface Bid {
  ID: number;
  MemberID: number;
  Member?: Member;
  Month: number;
  Year: number;
  Amount: number;
  CreatedAt: string;
}

export interface MemberRow {
  Member: Member;
  Payment: Payment;
  NextPaymentValue: number;
  WinnerNumber: number;
  BidAmount: number;
  HasBid: boolean;
  HasSlip: boolean;
  SlipFileName?: string | null;
}

export interface MonthSummary {
  MonthName: string;
  PaidCount: number;
  TotalMembers: number;
  PrincipalMoney: number;
  InterestMoney: number;
  TotalMoney: number;
}

export interface IndexData {
  Rows: MemberRow[];
  TotalMembers: number;
  PaidCount: number;
  UnpaidCount: number;
  CollectedMoney: number;
  LatestWinnerName: string;
  LatestInterest: number;
  LatestWinnerNumber: number;
  Month: number;
  Year: number;
  Search: string;
  Setting: Setting;
  ThaiMonthName: string;
  ThaiMonths: string[];
  IsAdmin: boolean;
  AlertMsg: string;
  AlertErr: string;
  YearlySummaries: MonthSummary[];
  YearlyTotalPrincipal: number;
  YearlyTotalInterest: number;
  YearlyTotalCollected: number;
  AuctionNotStarted: boolean;
  AuctionClosed: boolean;
  AuctionStartStr: string;
  AuctionDeadlineStr: string;
  NoBidsAtAll: boolean;
  Bids: Bid[];
}
