import { computeIndexData } from "@/lib/data";
import { getCurrentMonth, getCurrentYear } from "@/lib/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LotteryClient from "./LotteryClient";

interface PageProps {
  searchParams: {
    month?: string;
    year?: string;
  };
}

export default async function LotteryPage({ searchParams }: PageProps) {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get("admin_auth");

  // Protect lottery page - redirect to home if not authenticated
  if (adminCookie?.value !== "true") {
    redirect(`/?msg=${encodeURIComponent("กรุณาเข้าสู่ระบบผู้ดูแลก่อน")}`);
  }

  const month = searchParams.month ? parseInt(searchParams.month) : getCurrentMonth();
  const year = searchParams.year ? parseInt(searchParams.year) : getCurrentYear();

  let data;
  try {
    data = await computeIndexData(month, year, "");
    data.IsAdmin = true;
  } catch (err) {
    redirect(`/admin?error=${encodeURIComponent("ไม่สามารถโหลดข้อมูลสุ่มจับฉลากได้")}`);
  }

  const hasWinnerThisMonth = data.Rows.some((row) => 
    row.Member.HasReceivedShare && 
    row.Member.ReceivedMonth === data.Month && 
    row.Member.ReceivedYear === data.Year
  );

  if (hasWinnerThisMonth) {
    redirect(`/admin?msg=${encodeURIComponent("งวดนี้มีผู้ได้รับแชร์เรียบร้อยแล้ว ไม่สามารถสุ่มจับฉลากซ้ำได้")}`);
  }

  return (
    <>
      <LotteryClient data={data} />
    </>
  );
}
