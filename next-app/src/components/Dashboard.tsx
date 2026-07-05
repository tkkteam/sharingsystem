"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { IndexData } from "@/lib/types";
import { formatMoney, formatThaiTime, parseThaiDate } from "@/lib/utils";
import Modals from "./Modals";
import SpinningWheel from "./SpinningWheel";
import { useToast } from "./Toast";

interface Props {
  data: IndexData;
}

export default function Dashboard({ data }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState(data.Search || "");
  const [pinError, setPinError] = useState<{ show: boolean; memberId?: string }>({ show: false });
  const [auctionStatus, setAuctionStatus] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: "", message: "" });
  const [auctionClosed, setAuctionClosed] = useState(data.AuctionClosed);
  const [auctionNotStarted, setAuctionNotStarted] = useState(data.AuctionNotStarted);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [rows, setRows] = useState(data.Rows);

  // Sync rows when data changes
  useEffect(() => {
    setRows(data.Rows);
  }, [data.Rows]);

  // Show alert messages from URL as toasts
  useEffect(() => {
    if (data.AlertMsg) showToast(data.AlertMsg, "success");
    if (data.AlertErr && !data.AlertErr.includes("PIN") && !data.AlertErr.includes("รหัส")) showToast(data.AlertErr, "error");
  }, [data.AlertMsg, data.AlertErr, showToast]);

  useEffect(() => {
    if (data.AlertErr && (data.AlertErr.includes("PIN") || data.AlertErr.includes("รหัส"))) {
      const params = new URLSearchParams(window.location.search);
      const memberId = params.get("member_id") || undefined;
      setPinError({ show: true, memberId });
    }
  }, [data.AlertErr]);

  // Clear URL query parameters to clean up address bar using Next.js router
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("error") || url.searchParams.has("msg") || url.searchParams.has("member_id")) {
        url.searchParams.delete("error");
        url.searchParams.delete("msg");
        url.searchParams.delete("member_id");
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }, [data.AlertErr, data.AlertMsg, router]);

  // Setup bid modal button handlers
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".open-bid-btn");
      if (!btn) return;
      const memberId = btn.getAttribute("data-member-id");
      const idEl = document.getElementById("bid-member-id") as HTMLInputElement | null;
      if (idEl && memberId) idEl.value = memberId;
      const pinEl = document.getElementById("bid-pin-input") as HTMLInputElement | null;
      if (pinEl) pinEl.value = "";
      const errEl = document.getElementById("bid-pin-error");
      if (errEl) (errEl as HTMLElement).style.display = "none";
      if (pinEl) pinEl.classList.remove("is-invalid");
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  // Setup upload slip modal button handlers
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".open-upload-btn");
      if (!btn) return;
      const memberId = btn.getAttribute("data-member-id");
      const memberName = btn.getAttribute("data-member-name");
      const idEl = document.getElementById("upload-slip-member-id") as HTMLInputElement | null;
      if (idEl && memberId) idEl.value = memberId;
      const nameEl = document.getElementById("upload-slip-member-name") as HTMLElement | null;
      if (nameEl && memberName) nameEl.innerText = memberName;
      const pinEl = document.getElementById("upload-slip-pin-input") as HTMLInputElement | null;
      if (pinEl) pinEl.value = "";
      const fileEl = document.getElementById("upload-slip-file-input") as HTMLInputElement | null;
      if (fileEl) fileEl.value = "";
      
      const errEl = document.getElementById("upload-slip-pin-error");
      if (errEl) (errEl as HTMLElement).style.display = "none";
      if (pinEl) pinEl.classList.remove("is-invalid");
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!data.Setting.AuctionDeadline) return;
    const start = parseThaiDate(data.AuctionStartStr);
    const deadline = parseThaiDate(data.AuctionDeadlineStr);
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
    const timeEl = document.getElementById("deadline-time-text");
    const timerEl = document.getElementById("countdown-timer");
    const deadlineLabelEl = document.getElementById("deadline-label-text");
    const countdownLabelEl = document.getElementById("countdown-label-text");
    if (!timerEl) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    const update = () => {
      if (data.Setting.AuctionActive === false) {
        setAuctionNotStarted(false);
        setAuctionClosed(true);
        if (timeEl) timeEl.innerText = "ปิดการประมูลแล้ว (โดยแอดมิน)";
        if (deadlineLabelEl) deadlineLabelEl.innerText = "สิ้นสุดการประมูลเสนอราคา";
        if (countdownLabelEl) countdownLabelEl.innerText = "เวลาประมูลเสนอราคาคงเหลือ";
        if (timerEl) {
          timerEl.innerText = "ปิดรับการเปียแชร์แล้ว";
          timerEl.className = "fs-4 fw-bold text-danger";
        }
        if (interval) clearInterval(interval);
        return;
      }

      const now = new Date();
      if (start && now < start) {
        setAuctionNotStarted(true);
        setAuctionClosed(false);
        const diff = start.getTime() - now.getTime();
        const hours = Math.floor(diff / 3.6e6);
        const minutes = Math.floor((diff % 3.6e6) / 6e4);
        const seconds = Math.floor((diff % 6e4) / 1000);
        if (deadlineLabelEl) deadlineLabelEl.innerText = "เปิดระบบเปียแชร์";
        if (countdownLabelEl) countdownLabelEl.innerText = "ระบบเปิดเปียแชร์จะเริ่มในอีก";
        if (timeEl) timeEl.innerText = "เปิดระบบเปียแชร์ประจำวันที่ " + start.toLocaleDateString("th-TH", options) + " น.";
        timerEl.innerText = hours + " ชม. " + minutes + " น. " + seconds + " วิ.";
        timerEl.className = "fs-5 fw-bold text-secondary";
      } else if (deadline && now < deadline) {
        setAuctionNotStarted(false);
        setAuctionClosed(false);
        const diff = deadline.getTime() - now.getTime();
        const hours = Math.floor(diff / 3.6e6);
        const minutes = Math.floor((diff % 3.6e6) / 6e4);
        const seconds = Math.floor((diff % 6e4) / 1000);
        if (deadlineLabelEl) deadlineLabelEl.innerText = "สิ้นสุดการประมูลเสนอราคา";
        if (countdownLabelEl) countdownLabelEl.innerText = "เวลาประมูลเสนอราคาคงเหลือ";
        if (timeEl) timeEl.innerText = "สิ้นสุดประมูลในวันที่ " + deadline.toLocaleDateString("th-TH", options) + " น.";
        timerEl.innerText = hours + " ชม. " + minutes + " น. " + seconds + " วิ.";
        timerEl.className = "fs-4 fw-bold text-warning";
      } else {
        setAuctionNotStarted(false);
        setAuctionClosed(true);
        if (deadlineLabelEl) deadlineLabelEl.innerText = "สิ้นสุดการประมูลเสนอราคา";
        if (countdownLabelEl) countdownLabelEl.innerText = "เวลาประมูลเสนอราคาคงเหลือ";
        if (timeEl) {
          if (data.NoBidsAtAll) {
            timeEl.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-shuffle me-1"></i>ปิดประมูลแล้ว (ไม่มีผู้เสนอราคา - รอจับฉลาก)</span>';
          } else {
            timeEl.innerText = "ปิดประมูลเสร็จสิ้นแล้วเมื่อ " + (deadline ? deadline.toLocaleDateString("th-TH", options) + " น." : "");
          }
        }
        if (data.NoBidsAtAll) {
          timerEl.innerText = "รอจับฉลาก";
          timerEl.className = "fs-4 fw-bold text-warning";
        } else {
          timerEl.innerText = "ปิดรับการเปียแชร์แล้ว";
          timerEl.className = "fs-4 fw-bold text-danger";
        }
        if (interval) clearInterval(interval);
      }
    };
    update();
    interval = setInterval(update, 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [data.AuctionStartStr, data.AuctionDeadlineStr, data.NoBidsAtAll, data.Setting.AuctionDeadline]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.Member.Name.toLowerCase().includes(q) ||
        (r.Member.Phone || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Handle slip upload via AJAX
  const handleSlipUpload = useCallback(async (memberId: number, file: File) => {
    setUploadingId(memberId);
    try {
      const formData = new FormData();
      formData.append("member_id", String(memberId));
      formData.append("month", String(data.Month));
      formData.append("year", String(data.Year));
      formData.append("slip", file);

      const res = await fetch("/api/slips/upload-json", { method: "POST", body: formData });
      const result = await res.json();

      if (result.success) {
        showToast(result.message || "อัพโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ", "success");
        // Update local state
        setRows((prev) =>
          prev.map((r) =>
            r.Member.ID === memberId ? { ...r, HasSlip: true } : r
          )
        );
        router.refresh();
      } else {
        showToast(result.error || "อัพโหลดสลิปไม่สำเร็จ", "error");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการอัพโหลดสลิป", "error");
    } finally {
      setUploadingId(null);
    }
  }, [data.Month, data.Year, showToast, router]);

  // Handle slip delete via AJAX (admin only)
  const handleSlipDelete = useCallback(async (memberId: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบสลิปนี้?")) return;
    setDeletingId(memberId);
    try {
      const formData = new FormData();
      formData.append("member_id", String(memberId));
      formData.append("month", String(data.Month));
      formData.append("year", String(data.Year));

      const res = await fetch("/api/slips/delete-json", { method: "POST", body: formData });
      const result = await res.json();

      if (result.success) {
        showToast(result.message || "ลบสลิปเรียบร้อยแล้ว", "success");
        setRows((prev) =>
          prev.map((r) =>
            r.Member.ID === memberId ? { ...r, HasSlip: false } : r
          )
        );
        router.refresh();
      } else {
        showToast(result.error || "ลบสลิปไม่สำเร็จ", "error");
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการลบสลิป", "error");
    } finally {
      setDeletingId(null);
    }
  }, [data.Month, data.Year, showToast, router]);

  const everyonePaid = data.UnpaidCount === 0 && data.TotalMembers > 0;
  const hasWinnerThisMonth = data.Rows.some((row) => 
    row.Member.HasReceivedShare && 
    row.Member.ReceivedMonth === data.Month && 
    row.Member.ReceivedYear === data.Year
  );
  const basePath = data.IsAdmin ? "/admin" : "/";

  return (
    <div className="container py-4">
      {/* Admin bar */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3 animate-fade-in">
        <div>
          {data.IsAdmin ? (
            <span className="badge bg-success p-2 fs-7">
              <i className="bi bi-shield-lock-fill me-1"></i>โหมดผู้ดูแลระบบ (Admin Mode)
            </span>
          ) : (
            <span className="badge bg-secondary p-2 fs-7">
              <i className="bi bi-eye-fill me-1"></i>โหมดอ่านอย่างเดียว (Read-Only Mode)
            </span>
          )}
        </div>
        <div className="w-100 w-sm-auto">
          {data.IsAdmin ? (
            <form action="/api/auth/logout" method="GET" className="m-0">
              <button type="submit" className="btn btn-sm btn-outline-danger w-100 w-sm-auto">
                <i className="bi bi-box-arrow-right me-1"></i>ออกจากระบบ Admin
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn-sm btn-cyber w-100 w-sm-auto" data-bs-toggle="modal" data-bs-target="#loginModal">
              <i className="bi bi-box-arrow-in-right me-1"></i>เข้าสู่ระบบ Admin
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 animate-fade-in">
        <div>
          <h1 className="dashboard-title mb-1">
            <i className="bi bi-wallet2 me-2"></i>ระบบจัดการวงแชร์
          </h1>
          <p className="text-secondary mb-0">
            สำหรับบริหารวงแชร์ขนาดเล็ก (5-50 คน) • ค่าส่งพื้นฐาน {formatMoney(data.Setting.MonthlyAmount)} บาท/เดือน •{" "}
            <span className="text-warning fw-bold">
              <i className="bi bi-exclamation-circle-fill me-1"></i>ครบกำหนดจ่ายทุกวันที่ 5 ของเดือน
            </span>
          </p>
        </div>

        <div className="glass-card p-3 d-flex align-items-center gap-2 flex-wrap">
          <form action={basePath} method="GET" className="d-flex align-items-center gap-2 m-0">
            <select name="month" className="form-select form-control-custom" style={{ width: "auto" }} defaultValue={data.Month}>
              {data.ThaiMonths.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
            <input type="number" name="year" defaultValue={data.Year} className="form-control form-control-custom" style={{ width: 100 }} min={2000} max={2100} />
            <button type="submit" className="btn btn-cyber">
              <i className="bi bi-calendar-check-fill me-1"></i> แสดง
            </button>
          </form>
          <button type="button" className="btn btn-warning text-dark fw-bold ms-sm-2" data-bs-toggle="modal" data-bs-target="#summaryModal">
            <i className="bi bi-bar-chart-line-fill me-1"></i> สรุปยอดรายปี
          </button>
        </div>
      </div>

      {/* Countdown Banner */}
      {data.Setting.AuctionDeadline && !hasWinnerThisMonth && (
        <div className="glass-card p-3 mb-4 animate-fade-in d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ background: "rgba(255, 193, 7, 0.08)", borderLeft: "4px solid var(--warning-color)" }}>
          <div className="d-flex align-items-center">
            <div className="stat-icon stat-orange me-3" style={{ fontSize: "1.25rem", width: 40, height: 40, borderRadius: 8 }}>
              <i className="bi bi-hourglass-split"></i>
            </div>
            <div>
              <div className="text-secondary fs-7" id="deadline-label-text">สิ้นสุดการประมูลเสนอราคา</div>
              <div className="fw-bold text-dark fs-6" id="deadline-time-text"></div>
            </div>
          </div>
          <div className="text-end">
            <div className="text-secondary fs-7" id="countdown-label-text">เวลาประมูลเสนอราคาคงเหลือ</div>
            <div className="fs-4 fw-bold text-warning" id="countdown-timer">กำลังคำนวณ...</div>
          </div>
        </div>
      )}

      {/* Dashboard cards */}
      <div className="row g-3 mb-4 animate-fade-in">
        <div className="col-6 col-md-3">
          <div className="glass-card p-3 h-100 d-flex align-items-center">
            <div className="stat-icon stat-cyan me-3"><i className="bi bi-people-fill"></i></div>
            <div>
              <div className="text-secondary fs-7">สมาชิกทั้งหมด</div>
              <div className="fs-4 fw-bold">{data.TotalMembers} คน</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-card p-3 h-100 d-flex align-items-center">
            <div className="stat-icon stat-green me-3"><i className="bi bi-check-circle-fill"></i></div>
            <div>
              <div className="text-secondary fs-7">ชำระแล้ว</div>
              <div className="fs-4 fw-bold text-success">{data.PaidCount} คน</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-card p-3 h-100 d-flex align-items-center">
            <div className="stat-icon stat-red me-3"><i className="bi bi-clock-fill"></i></div>
            <div>
              <div className="text-secondary fs-7">ยังไม่ชำระ</div>
              <div className="fs-4 fw-bold text-danger">{data.UnpaidCount} คน</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-card p-3 h-100 d-flex align-items-center">
            <div className="stat-icon stat-blue me-3"><i className="bi bi-currency-dollar"></i></div>
            <div>
              <div className="text-secondary fs-7">เก็บได้ประจำงวด</div>
              <div className="fs-4 fw-bold text-info">{formatMoney(data.CollectedMoney)} ฿</div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Winner + Admin buttons */}
      <div className="row g-3 mb-4 animate-fade-in">
        <div className="col-12">
          <div className="glass-card p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center">
              <div className="stat-icon stat-orange me-3"><i className="bi bi-trophy-fill"></i></div>
              <div>
                <div className="text-secondary fs-7">ผู้ได้รับแชร์ล่าสุดประจำวง</div>
                <div className="fw-bold fs-5 text-warning">
                  {data.LatestWinnerName}
                  {data.LatestWinnerNumber > 0 && (
                    <span className="fs-7 text-secondary fw-normal"> (คนที่ {data.LatestWinnerNumber})</span>
                  )}
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center">
              <div className="stat-icon stat-orange me-3"><i className="bi bi-percent"></i></div>
              <div>
                <div className="text-secondary fs-7">ดอกเบี้ยล่าสุด</div>
                <div className="fw-bold fs-5 text-warning">{formatMoney(data.LatestInterest)} ฿</div>
              </div>
            </div>
            {data.IsAdmin && (
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <button className="btn btn-cyber" data-bs-toggle="modal" data-bs-target="#winnerModal">
                  <i className="bi bi-award-fill me-1"></i> บันทึกผู้ได้รับแชร์
                </button>
                {!hasWinnerThisMonth && (
                  <button 
                    type="button" 
                    className="btn btn-warning text-dark fw-bold" 
                    onClick={() => window.open(`/admin/lottery?month=${data.Month}&year=${data.Year}`, "_blank")}
                  >
                    <i className="bi bi-shuffle me-1"></i> สุ่มจับฉลาก
                  </button>
                )}
                <button className="btn btn-cyber-outline" data-bs-toggle="modal" data-bs-target="#settingsModal">
                  <i className="bi bi-gear-fill me-1"></i> แก้ไขค่าส่งรายเดือน
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bidding Summary */}
      {data.IsAdmin && (
        <div className="glass-card p-4 mb-4 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5 className="fw-bold mb-0 text-dark">
              <i className="bi bi-award-fill text-warning me-2"></i>สรุปผลการเสนอราคาประมูล (งวดประจำเดือน {data.ThaiMonthName} {data.Year})
            </h5>
            {data.IsAdmin && !data.AuctionClosed && (
              <span className="badge bg-warning text-dark">
                <i className="bi bi-clock-history me-1"></i>กำลังเปิดรับเสนอราคา
              </span>
            )}
            {data.AuctionClosed && (
              <span className="badge bg-danger">
                <i className="bi bi-lock-fill me-1"></i>ปิดการเสนอราคาแล้ว
              </span>
            )}
          </div>

          {data.Bids.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-custom align-middle">
                <thead>
                  <tr>
                    <th style={{ width: "15%", textAlign: "center" }}>ลำดับที่</th>
                    <th>ผู้เสนอราคา</th>
                    <th style={{ textAlign: "right" }}>ดอกเบี้ยเสนอ (บาท)</th>
                    <th style={{ textAlign: "center" }}>เวลาที่เสนอ</th>
                    {data.IsAdmin && <th style={{ textAlign: "center" }}>การดำเนินการ</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.Bids.map((bid, bIdx) => (
                    <tr key={bid.ID} style={bIdx === 0 ? { background: "rgba(255, 193, 7, 0.05)", borderLeft: "4px solid var(--warning-color)" } : {}}>
                      <td style={{ textAlign: "center" }}>
                        {bIdx === 0 ? (
                          <span className="badge bg-warning text-dark fs-7">
                            <i className="bi bi-trophy-fill text-dark me-1"></i> อันดับ 1 (สูงสุด)
                          </span>
                        ) : (
                          <span className="badge bg-secondary px-2 py-1 fs-7">อันดับ {bIdx + 1}</span>
                        )}
                      </td>
                      <td><span className="fw-bold text-dark">{bid.Member?.Name || "-"}</span></td>
                      <td style={{ textAlign: "right" }} className="fw-bold text-warning fs-5">{formatMoney(bid.Amount)} ฿</td>
                      <td style={{ textAlign: "center" }} className="text-secondary fs-7">{formatThaiTime(bid.CreatedAt)}</td>
                      {data.IsAdmin && (
                        <td style={{ textAlign: "center" }}>
                          <div className="d-flex justify-content-center gap-2">
                            {bIdx === 0 && (
                              <button type="button" className="btn btn-sm btn-warning text-dark fw-bold px-3 py-1" onClick={() => selectWinnerFromBid(bid.MemberID, bid.Amount)}>
                                <i className="bi bi-check-circle-fill me-1"></i> ยืนยันผลรับแชร์
                              </button>
                            )}
                            <form action="/api/bids/delete" method="POST" className="m-0" onSubmit={(e) => { if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบการเสนอราคานี้ของ ${bid.Member?.Name || "-"}?`)) e.preventDefault(); }}>
                              <input type="hidden" name="member_id" value={bid.MemberID} />
                              <input type="hidden" name="month" value={data.Month} />
                              <input type="hidden" name="year" value={data.Year} />
                              <button type="submit" className="btn btn-sm btn-outline-danger py-1 px-2" title="ลบการเสนอราคา">
                                <i className="bi bi-trash"></i> ลบประมูล
                              </button>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-secondary">
              <i className="bi bi-inbox fs-3 d-block mb-2"></i> 
              <span className="d-block mb-2">ยังไม่มีสมาชิกคนใดยื่นเสนอราคาในงวดนี้</span>
              {data.IsAdmin && (
                <div className="mt-3">
                  {!hasWinnerThisMonth && (
                    <button 
                      type="button" 
                      className="btn btn-warning text-dark fw-bold px-4" 
                      onClick={() => window.open(`/admin/lottery?month=${data.Month}&year=${data.Year}`, "_blank")}
                    >
                      <i className="bi bi-shuffle me-1"></i> สุ่มจับฉลาก
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Member Cards */}
      <div className="glass-card p-4 animate-fade-in">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <h4 className="mb-0 fw-bold">
            <i className="bi bi-grid-3x3-gap-fill me-2 text-cyan"></i> สถานะงวด {data.ThaiMonthName} {data.Year}
          </h4>
          <div className="d-flex flex-column flex-sm-row gap-2 align-items-stretch">
            <div className="input-group">
              <span className="input-group-text input-group-text-custom"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control form-control-custom" placeholder="ค้นหาชื่อ..." style={{ minWidth: 200 }} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search && (
              <a href={`${basePath}?month=${data.Month}&year=${data.Year}`} className="btn btn-outline-secondary d-flex align-items-center">
                <i className="bi bi-x-lg"></i>
              </a>
            )}
            {data.IsAdmin && (
              <>
                <button type="button" className="btn btn-outline-danger" data-bs-toggle="modal" data-bs-target="#resetPaymentModal">
                  <i className="bi bi-arrow-counterclockwise me-1"></i> รีเซ็ตสถานะชำระเงิน
                </button>
                <button type="button" className="btn btn-cyber" data-bs-toggle="modal" data-bs-target="#addMemberModal">
                  <i className="bi bi-person-plus-fill me-1"></i> เพิ่มสมาชิก
                </button>
              </>
            )}
          </div>
        </div>

        {/* Member Cards Grid */}
        {filteredRows.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-inbox fs-3 d-block mb-2"></i> ไม่พบข้อมูลสมาชิก
          </div>
        ) : (
          <div className="row g-3">
            {filteredRows.map((row, idx) => (
              <MemberCard
                key={row.Member.ID}
                row={row}
                index={idx}
                data={data}
                auctionClosed={auctionClosed}
                auctionNotStarted={auctionNotStarted}
                uploading={uploadingId === row.Member.ID}
                deleting={deletingId === row.Member.ID}
                onUpload={(file) => handleSlipUpload(row.Member.ID, file)}
                onDelete={() => handleSlipDelete(row.Member.ID)}
              />
            ))}
          </div>
        )}
      </div>

      <Modals data={data} pinError={pinError} clearPinError={() => setPinError({ show: false })} auctionStatus={auctionStatus} clearAuctionStatus={() => setAuctionStatus({ show: false, title: "", message: "" })} />
      <SpinningWheel data={data} />
    </div>
  );
}

function selectWinnerFromBid(memberId: number, amount: number) {
  const modalEl = document.getElementById("winnerModal");
  if (!modalEl) return;
  ensureBootstrap().then((bs) => {
    const win = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
    win.show();
    const selectEl = document.querySelector('#winnerModal select[name="member_id"]') as HTMLSelectElement | null;
    if (selectEl) selectEl.value = String(memberId);
    const interestEl = document.querySelector('#winnerModal input[name="interest_amount"]') as HTMLInputElement | null;
    if (interestEl) interestEl.value = String(amount);
  });
}

function MemberCard({
  row,
  index,
  data,
  auctionClosed,
  auctionNotStarted,
  uploading,
  deleting,
  onUpload,
  onDelete,
}: {
  row: IndexData["Rows"][0];
  index: number;
  data: IndexData;
  auctionClosed: boolean;
  auctionNotStarted: boolean;
  uploading: boolean;
  deleting: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const m = row.Member;

  // Format start time for display when not started yet
  const startObj = data.AuctionStartStr ? parseThaiDate(data.AuctionStartStr) : null;
  const startTimeText = startObj 
    ? startObj.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น."
    : "";
  const startDateText = startObj
    ? startObj.toLocaleDateString("th-TH", { day: "numeric", month: "short" })
    : "";
  const startButtonText = startObj
    ? `เปิดเปียแชร์ ${startDateText} เวลา ${startTimeText}`
    : "ระบบเปียแชร์ยังไม่เปิด";

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3 animate-fade-in" data-name={m.Name} data-phone={m.Phone} style={{ animationDelay: `${index * 0.03}s` }}>
      <div className="glass-card p-3 h-100" style={{ background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
        {/* Name only */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "1.05rem" }}>{m.Name}</h5>
              {data.IsAdmin && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline-primary py-0 px-2 fw-bold"
                  style={{ borderRadius: "10px", fontSize: "0.68rem", padding: "1px 6px", border: "1px solid rgba(13, 110, 253, 0.4)" }}
                  onClick={() => openInfoModal(row)}
                  title="ดูและแก้ไขรายละเอียดผู้ใช้"
                >
                  <i className="bi bi-person-badge-fill me-1"></i>ข้อมูลผู้ใช้
                </button>
              )}
            </div>
            {data.IsAdmin && (
              <div className="mt-1">
                <div className="text-primary fs-7 fw-bold">
                  <i className="bi bi-key-fill me-1"></i>PIN: {m.BidPassword}
                </div>
                <div className="mt-1" style={{ fontSize: "0.78rem" }}>
                  <div className="d-flex align-items-center gap-1" style={{ color: "#000000" }}>
                    <i className="bi bi-person-vcard text-primary"></i>
                    <span className="fw-semibold">{m.FirstName || m.LastName ? `${m.FirstName} ${m.LastName}` : "ไม่ได้ระบุชื่อ-นามสกุล"}</span>
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-0.5" style={{ color: "#000000" }}>
                    <i className="bi bi-telephone text-primary"></i>
                    <span className="fw-semibold">{m.Phone || "ไม่ได้ระบุเบอร์โทรศัพท์"}</span>
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-0.5" style={{ color: "#000000" }}>
                    {m.BankName ? getBankLogo(m.BankName) : <i className="bi bi-bank text-primary"></i>}
                    <span className="fw-semibold">{m.BankName || m.AccountNumber ? `${m.BankName} ${m.AccountNumber}` : "ไม่ได้ระบุธนาคาร/เลขบัญชี"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {m.HasReceivedShare && (
            <span className="badge-winner">
              <i className="bi bi-trophy-fill"></i> {row.WinnerNumber}
            </span>
          )}
        </div>

        {/* Payment status */}
        <div className="mb-2">
          {data.IsAdmin ? (
            <form action="/api/payments/toggle" method="POST" className="m-0">
              <input type="hidden" name="member_id" value={m.ID} />
              <input type="hidden" name="month" value={data.Month} />
              <input type="hidden" name="year" value={data.Year} />
              <button type="submit" className={`btn btn-sm toggle-btn w-100 ${row.Payment.Paid ? "badge-paid" : "badge-unpaid"}`}>
                {row.Payment.Paid ? (
                  <><i className="bi bi-check-circle-fill"></i> ชำระแล้วสำเร็จ</>
                ) : (
                  <><i className="bi bi-clock-fill"></i> ยังไม่ชำระ</>
                )}
              </button>
            </form>
          ) : row.Payment.Paid ? (
            <span className="badge-paid w-100 d-block text-center">
              <i className="bi bi-check-circle-fill"></i> ชำระแล้วสำเร็จ
            </span>
          ) : (
            <span className="badge-unpaid w-100 d-block text-center">
              <i className="bi bi-clock-fill"></i> ยังไม่ชำระ
            </span>
          )}
        </div>

        {/* Slip section */}
        {data.IsAdmin ? (
          // ADMIN: show slip image for verification or cash/transfer status
          row.HasSlip ? (
            <div className="mb-2">
              {row.SlipFileName === "TRANSFER" ? (
                <div className="text-center text-success border border-success rounded p-2 mb-1 bg-success bg-opacity-10" style={{ fontSize: "0.85rem" }}>
                  <i className="bi bi-bank fs-4 d-block mb-1"></i>
                  <span className="fw-bold">โอนเงินแล้ว (แอดมินบันทึก)</span>
                </div>
              ) : row.SlipFileName === "CASH" ? (
                <div className="text-center text-primary border border-primary rounded p-2 mb-1 bg-primary bg-opacity-10" style={{ fontSize: "0.85rem" }}>
                  <i className="bi bi-cash-coin fs-4 d-block mb-1"></i>
                  <span className="fw-bold">จ่ายเงินสดแล้ว (แอดมินบันทึก)</span>
                </div>
              ) : (
                <img
                  src={`/api/slips/view?member_id=${m.ID}&month=${data.Month}&year=${data.Year}&t=${Date.now()}`}
                  alt={`สลิปของ ${m.Name}`}
                  className="img-fluid rounded w-100"
                  style={{ maxHeight: 220, objectFit: "cover", cursor: "pointer" }}
                  onClick={() => window.open(`/api/slips/view?member_id=${m.ID}&month=${data.Month}&year=${data.Year}`, "_blank")}
                />
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-danger w-100 mt-1"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span> กำลังลบ...</>
                ) : (
                  <><i className="bi bi-trash me-1"></i> ลบสลิป</>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="text-center text-secondary fs-7 mb-2 py-2">
                <i className="bi bi-receipt"></i> ยังไม่มีสลิป
              </div>
              {!row.Payment.Paid && (
                <div className="d-flex gap-1 mb-2">
                  <form action="/api/payments/admin-pay" method="POST" className="flex-grow-1 m-0">
                    <input type="hidden" name="member_id" value={m.ID} />
                    <input type="hidden" name="month" value={data.Month} />
                    <input type="hidden" name="year" value={data.Year} />
                    <input type="hidden" name="type" value="TRANSFER" />
                    <button type="submit" className="btn btn-sm btn-cyber w-100 py-1" style={{ fontSize: "0.75rem" }}>
                      <i className="bi bi-bank me-1"></i>โอนแล้ว
                    </button>
                  </form>
                  <form action="/api/payments/admin-pay" method="POST" className="flex-grow-1 m-0">
                    <input type="hidden" name="member_id" value={m.ID} />
                    <input type="hidden" name="month" value={data.Month} />
                    <input type="hidden" name="year" value={data.Year} />
                    <input type="hidden" name="type" value="CASH" />
                    <button type="submit" className="btn btn-sm btn-cyber-outline w-100 py-1" style={{ fontSize: "0.75rem" }}>
                      <i className="bi bi-cash-coin me-1"></i>จ่ายเงินสด
                    </button>
                  </form>
                </div>
              )}
            </>
          )
        ) : (
          // USER: upload slip button (cannot view after upload)
          <>
            {!row.Payment.Paid && (
              <button
                type="button"
                className={`btn btn-sm w-100 open-upload-btn ${row.HasSlip ? "btn-outline-success" : "btn-cyber"}`}
                data-bs-toggle="modal"
                data-bs-target="#uploadSlipModal"
                data-member-id={m.ID}
                data-member-name={m.Name}
              >
                <i className={`bi ${row.HasSlip ? "bi-check-circle-fill" : "bi-cloud-upload-fill"} me-1`}></i>
                {row.HasSlip ? "อัพสลิปใหม่" : "อัพโหลดสลิป"}
              </button>
            )}
            {row.HasSlip && !row.Payment.Paid && (
              <div className="text-center text-success fs-7 mt-1">
                <i className="bi bi-shield-check me-1"></i>ส่งสลิปแล้ว (รอตรวจสอบ)
              </div>
            )}
          </>
        )}

        {/* Bidding Section */}
        {data.Setting.AuctionActive && !m.HasReceivedShare && (row.HasBid || !data.IsAdmin) && (
          <div className="mt-2 pt-2 border-top">
            {row.HasBid ? (
              <div className="text-center text-warning fs-7 fw-bold py-1 bg-warning bg-opacity-10 border border-warning rounded">
                <i className="bi bi-check-circle-fill me-1"></i>
                {data.IsAdmin ? `เสนอราคาแล้ว: ${formatMoney(row.BidAmount)} ฿` : "เสนอราคาแล้ว"}
              </div>
            ) : auctionClosed ? (
              <button type="button" className="btn btn-sm btn-secondary w-100" disabled>
                <i className="bi bi-lock-fill me-1"></i>ปิดรับเสนอราคา
              </button>
            ) : auctionNotStarted ? (
              <button type="button" className="btn btn-sm btn-secondary w-100" disabled title={`กำหนดเริ่ม: ${data.AuctionStartStr}`}>
                <i className="bi bi-clock-fill me-1"></i>{startButtonText}
              </button>
            ) : row.Payment.Paid ? (
              <button
                type="button"
                className="btn btn-sm btn-cyber w-100 open-bid-btn"
                data-member-id={m.ID}
                data-bs-toggle="modal"
                data-bs-target="#bidModal"
              >
                <i className="bi bi-lightning-fill me-1"></i>เปียแชร์
              </button>
            ) : (
              <div className="text-center text-danger fs-7 fw-bold py-1 bg-danger bg-opacity-10 border border-danger-subtle rounded">
                <i className="bi bi-exclamation-circle-fill me-1"></i>ชำระเงินก่อนเปียแชร์
              </div>
            )}
          </div>
        )}

        {/* Admin actions */}
        {data.IsAdmin && (
          <div className="d-flex gap-1 mt-2">
            <button type="button" className="btn btn-sm btn-cyber-outline flex-grow-1" onClick={() => openEditModal(row)}>
              <i className="bi bi-pencil"></i> แก้ไข
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger flex-grow-1" onClick={() => openDeleteModal(m.ID, m.Name)}>
              <i className="bi bi-trash"></i> ลบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    bootstrap: any;
  }
}

async function ensureBootstrap(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).bootstrap) {
    return (window as any).bootstrap;
  }
  const mod = await import("bootstrap/dist/js/bootstrap.bundle.min.js");
  const bs = (mod as any).default || mod;
  (window as any).bootstrap = bs;
  return bs;
}

function openEditModal(row: IndexData["Rows"][0]) {
  const m = row.Member;
  (document.getElementById("edit-id") as HTMLInputElement).value = String(m.ID);
  (document.getElementById("edit-name") as HTMLInputElement).value = m.Name;
  (document.getElementById("edit-phone") as HTMLInputElement).value = m.Phone || "";
  (document.getElementById("edit-has-received") as HTMLInputElement).checked = m.HasReceivedShare;
  const rMonth = m.ReceivedMonth && m.ReceivedMonth !== 0 ? m.ReceivedMonth : 1;
  const rYear = m.ReceivedYear && m.ReceivedYear !== 0 ? m.ReceivedYear : new Date().getFullYear();
  (document.getElementById("edit-received-month") as HTMLSelectElement).value = String(rMonth);
  (document.getElementById("edit-received-year") as HTMLInputElement).value = String(rYear);
  (document.getElementById("edit-interest") as HTMLInputElement).value = String(m.InterestAmount || 0);
  (document.getElementById("edit-bid-password") as HTMLInputElement).value = m.BidPassword || "";

  const interestContainer = document.getElementById("edit-interest-container") as HTMLElement;
  const dateContainer = document.getElementById("edit-received-date-container") as HTMLElement;
  if (m.HasReceivedShare) {
    interestContainer.style.display = "block";
    dateContainer.style.display = "flex";
  } else {
    interestContainer.style.display = "none";
    dateContainer.style.display = "none";
  }

  const modalEl = document.getElementById("editMemberModal");
  if (modalEl) {
    ensureBootstrap().then((bs) => {
      const modal = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
      modal.show();
    });
  }
}

function openDeleteModal(id: number, name: string) {
  (document.getElementById("delete-id") as HTMLInputElement).value = String(id);
  document.getElementById("delete-name-span")!.innerText = name;
  const modalEl = document.getElementById("deleteMemberModal");
  if (modalEl) {
    ensureBootstrap().then((bs) => {
      const modal = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
      modal.show();
    });
  }
}

function openInfoModal(row: IndexData["Rows"][0]) {
  const m = row.Member;
  (document.getElementById("info-id") as HTMLInputElement).value = String(m.ID);
  document.getElementById("info-name-label")!.innerText = m.Name;
  (document.getElementById("info-name") as HTMLInputElement).value = m.Name;
  (document.getElementById("info-phone") as HTMLInputElement).value = m.Phone || "";
  (document.getElementById("info-first-name") as HTMLInputElement).value = m.FirstName || "";
  (document.getElementById("info-last-name") as HTMLInputElement).value = m.LastName || "";
  (document.getElementById("info-bank-name") as HTMLInputElement).value = m.BankName || "";
  (document.getElementById("info-account-number") as HTMLInputElement).value = m.AccountNumber || "";
  
  const modalEl = document.getElementById("memberInfoModal");
  if (modalEl) {
    ensureBootstrap().then((bs) => {
      const modal = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
      modal.show();
    });
  }
}

function getBankLogo(bankName: string) {
  const name = (bankName || "").toLowerCase().trim();
  
  let bgColor = "#64748b"; // Default grey
  let textColor = "#ffffff";
  let text = "B";
  let fullName = "ธนาคาร";
  
  if (name.includes("กสิกร") || name.includes("kbank") || name.includes("kasikorn")) {
    bgColor = "#138f2e"; // KBANK Green
    text = "K";
    fullName = "กสิกรไทย";
  } else if (name.includes("ไทยพาณิชย์") || name.includes("scb") || name.includes("siam commercial")) {
    bgColor = "#4e2a84"; // SCB Purple
    text = "S";
    fullName = "ไทยพาณิชย์";
  } else if (name.includes("กรุงไทย") || name.includes("ktb") || name.includes("krungthai")) {
    bgColor = "#00a2e5"; // KTB Blue
    text = "KTB";
    fullName = "กรุงไทย";
  } else if (name.includes("กรุงเทพ") || name.includes("bbl") || name.includes("bangkok")) {
    bgColor = "#1e3a8a"; // BBL Dark Blue
    text = "BBL";
    fullName = "กรุงเทพ";
  } else if (name.includes("ทหารไทย") || name.includes("ธนชาต") || name.includes("ttb")) {
    bgColor = "#f97316"; // TTB Orange
    text = "ttb";
    fullName = "ทหารไทยธนชาต";
  } else if (name.includes("กรุงศรี") || name.includes("bay") || name.includes("krungsri")) {
    bgColor = "#fcd34d"; // BAY Yellow
    textColor = "#1e293b";
    text = "BAY";
    fullName = "กรุงศรีอยุธยา";
  } else if (name.includes("ออมสิน") || name.includes("gsb")) {
    bgColor = "#ec4899"; // GSB Pink
    text = "GSB";
    fullName = "ออมสิน";
  } else if (name.includes("ธกส") || name.includes("baac")) {
    bgColor = "#0f766e"; // BAAC Dark Green
    text = "ธกส";
    fullName = "ธ.ก.ส.";
  } else if (name.includes("ธอส") || name.includes("ghb")) {
    bgColor = "#ea580c"; // GHB Orange
    text = "ธอส";
    fullName = "ธอส.";
  } else if (name.includes("ยูโอบี") || name.includes("uob")) {
    bgColor = "#0b3c5d"; // UOB Dark Blue
    text = "UOB";
    fullName = "ยูโอบี";
  }

  return (
    <span 
      className="d-inline-flex align-items-center justify-content-center fw-bold text-center" 
      style={{ 
        width: "16px", 
        height: "16px", 
        borderRadius: "4px", 
        backgroundColor: bgColor, 
        color: textColor, 
        fontSize: "7.5px",
        lineHeight: "1",
        marginRight: "4px",
        border: "1px solid rgba(0,0,0,0.15)",
        flexShrink: 0
      }}
      title={fullName}
    >
      {text}
    </span>
  );
}