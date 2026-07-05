import { computeIndexData } from "@/lib/data";
import { getCurrentMonth, getCurrentYear } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";
import BootstrapClient from "@/components/BootstrapClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: {
    month?: string;
    year?: string;
    search?: string;
    msg?: string;
    error?: string;
    member_id?: string;
  };
}

export default async function AdminPage({ searchParams }: PageProps) {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get("admin_auth");

  // Protect admin page - redirect to home with login prompt if not authenticated
  if (adminCookie?.value !== "true") {
    redirect(`/?msg=${encodeURIComponent("กรุณาเข้าสู่ระบบผู้ดูแลก่อน")}`);
  }

  const month = searchParams.month ? parseInt(searchParams.month) : getCurrentMonth();
  const year = searchParams.year ? parseInt(searchParams.year) : getCurrentYear();

  let data;
  try {
    data = await computeIndexData(month, year, searchParams.search || "");
    data.IsAdmin = true;

    if (searchParams.msg) data.AlertMsg = decodeURIComponent(searchParams.msg);
    if (searchParams.error) data.AlertErr = decodeURIComponent(searchParams.error);
  } catch (err) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          ไม่สามารถโหลดข้อมูลได้
          <br />
          <small className="text-muted">{(err as Error).message}</small>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dashboard data={data} />
      <BootstrapClient />
    </>
  );
}