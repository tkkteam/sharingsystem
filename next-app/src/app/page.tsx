import { computeIndexData } from "@/lib/data";
import { getCurrentMonth, getCurrentYear } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";
import BootstrapClient from "@/components/BootstrapClient";

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

export default async function HomePage({ searchParams }: PageProps) {
  const month = searchParams.month ? parseInt(searchParams.month) : getCurrentMonth();
  const year = searchParams.year ? parseInt(searchParams.year) : getCurrentYear();

  let data;
  try {
    data = await computeIndexData(month, year, searchParams.search || "");
    data.IsAdmin = false; // Public page is always read-only

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