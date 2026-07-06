"use client";

import { useEffect, useState } from "react";
import type { IndexData } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface Props {
  data: IndexData;
  pinError: { show: boolean; memberId?: string };
  clearPinError: () => void;
  auctionStatus: { show: boolean; title: string; message: string };
  clearAuctionStatus: () => void;
}

export default function Modals({ data, pinError, clearPinError, auctionStatus, clearAuctionStatus }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [submittingSlip, setSubmittingSlip] = useState(false);
  const [uploadSlipError, setUploadSlipError] = useState<string | null>(null);
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (pinError.show && (data.AlertErr.includes("PIN") || data.AlertErr.includes("รหัส"))) {
      const idEl = document.getElementById("bid-member-id") as HTMLInputElement | null;
      if (idEl && pinError.memberId) idEl.value = pinError.memberId;
      const modalEl = document.getElementById("bidModal");
      if (modalEl && window.bootstrap) {
        const m = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
        m.show();
      }
      setBidError("ใส่รหัสไม่ถูกต้อง ติดต่อ admin เพื่อขอรหัส");
      const pinInput = document.getElementById("bid-pin-input") as HTMLInputElement | null;
      if (pinInput) {
        pinInput.classList.add("is-invalid");
        pinInput.value = "";
        pinInput.focus();
      }
    }
  }, [pinError, data.AlertErr]);

  const handleBidSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingBid(true);
    setBidError(null);

    const formData = new FormData(e.currentTarget);
    const memberId = formData.get("member_id");
    const month = formData.get("month");
    const year = formData.get("year");
    const amount = formData.get("amount");
    const pin = formData.get("pin");

    try {
      const res = await fetch("/api/bids/add-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, month, year, amount, pin }),
      });

      const result = await res.json();

      if (result.success) {
        showToast(result.message || "เสนอราคาประมูลสำเร็จ", "success");
        const pinInput = document.getElementById("bid-pin-input") as HTMLInputElement | null;
        if (pinInput) pinInput.value = "";
        
        const modalEl = document.getElementById("bidModal");
        if (modalEl && window.bootstrap) {
          const m = window.bootstrap.Modal.getInstance(modalEl);
          if (m) m.hide();
        }
        
        router.refresh();
      } else {
        setBidError(result.error || "เกิดข้อผิดพลาดในการส่งราคาประมูล");
        const pinInput = document.getElementById("bid-pin-input") as HTMLInputElement | null;
        if (pinInput) {
          pinInput.classList.add("is-invalid");
          pinInput.value = "";
          pinInput.focus();
        }
      }
    } catch (err) {
      setBidError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleUploadSlipSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingSlip(true);
    setUploadSlipError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/slips/upload-json", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        showToast(result.message || "อัพโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ", "success");
        
        const pinInput = document.getElementById("upload-slip-pin-input") as HTMLInputElement | null;
        if (pinInput) pinInput.value = "";
        const fileInput = document.getElementById("upload-slip-file-input") as HTMLInputElement | null;
        if (fileInput) fileInput.value = "";
        
        const modalEl = document.getElementById("uploadSlipModal");
        if (modalEl && window.bootstrap) {
          const m = window.bootstrap.Modal.getInstance(modalEl);
          if (m) m.hide();
        }
        
        router.refresh();
      } else {
        setUploadSlipError(result.error || "เกิดข้อผิดพลาดในการอัพโหลดสลิป");
        const pinInput = document.getElementById("upload-slip-pin-input") as HTMLInputElement | null;
        if (pinInput) {
          pinInput.classList.add("is-invalid");
          pinInput.value = "";
          pinInput.focus();
        }
      }
    } catch (err) {
      setUploadSlipError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setSubmittingSlip(false);
    }
  };

  useEffect(() => {
    const pinInput = document.getElementById("upload-slip-pin-input");
    if (!pinInput) return;
    const handler = () => {
      setUploadSlipError(null);
      const pi = document.getElementById("upload-slip-pin-input") as HTMLInputElement | null;
      if (pi) pi.classList.remove("is-invalid");
    };
    pinInput.addEventListener("input", handler);
    return () => pinInput.removeEventListener("input", handler);
  }, []);

  useEffect(() => {
    const el = document.getElementById("edit-has-received");
    if (!el) return;
    const handler = (e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      const interestContainer = document.getElementById("edit-interest-container") as HTMLElement;
      const dateContainer = document.getElementById("edit-received-date-container") as HTMLElement;
      if (checked) {
        interestContainer.style.display = "block";
        dateContainer.style.display = "flex";
      } else {
        interestContainer.style.display = "none";
        dateContainer.style.display = "none";
        (document.getElementById("edit-interest") as HTMLInputElement).value = "0";
      }
    };
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const fillInput = (id: string, iso: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el || !iso) return;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return;
      const pad = (n: number) => String(n).padStart(2, "0");
      el.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    fillInput("settings-auction-start", data.AuctionStartStr);
    fillInput("settings-auction-deadline", data.AuctionDeadlineStr);
  }, [data.AuctionStartStr, data.AuctionDeadlineStr]);

  useEffect(() => {
    const pinInput = document.getElementById("bid-pin-input");
    if (!pinInput) return;
    const handler = () => {
      const errEl = document.getElementById("bid-pin-error");
      const pi = document.getElementById("bid-pin-input") as HTMLInputElement | null;
      if (errEl) errEl.style.display = "none";
      if (pi) pi.classList.remove("is-invalid");
    };
    pinInput.addEventListener("input", handler);
    return () => pinInput.removeEventListener("input", handler);
  }, []);

  // Handle admin login via AJAX (show popup card error on wrong password)
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingLogin(true);
    setLoginError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login-json", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        showToast(result.message || "เข้าสู่ระบบสำเร็จ", "success");

        const modalEl = document.getElementById("loginModal");
        if (modalEl && window.bootstrap) {
          const m = window.bootstrap.Modal.getInstance(modalEl);
          if (m) m.hide();
        }

        // Redirect to admin page
        window.location.href = "/admin";
      } else {
        setLoginError(result.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง");
        const passwordInput = document.getElementById("login-password-input") as HTMLInputElement | null;
        if (passwordInput) {
          passwordInput.classList.add("is-invalid");
          passwordInput.value = "";
          passwordInput.focus();
        }
      }
    } catch (err) {
      setLoginError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองอีกครั้ง");
    } finally {
      setSubmittingLogin(false);
    }
  };

  // Clear login error when user types
  useEffect(() => {
    const loginInput = document.getElementById("login-password-input");
    if (!loginInput) return;
    const handler = () => {
      setLoginError(null);
      const pi = document.getElementById("login-password-input") as HTMLInputElement | null;
      if (pi) pi.classList.remove("is-invalid");
    };
    loginInput.addEventListener("input", handler);
    return () => loginInput.removeEventListener("input", handler);
  }, []);

  return (
    <>
      <div className="modal fade" id="bidModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <form onSubmit={handleBidSubmit}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title">
                  <i className="bi bi-pencil-square me-2 text-cyan"></i>เสนอราคาประมูลแชร์
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" disabled={submittingBid}></button>
              </div>
              <div className="modal-body p-4">
                <input type="hidden" name="member_id" id="bid-member-id" />
                <input type="hidden" name="month" value={data.Month} />
                <input type="hidden" name="year" value={data.Year} />

                {/* Tailwind-style Error Banner */}
                <div 
                  id="bid-pin-error" 
                  style={{ 
                    display: bidError ? "block" : "none", 
                    backgroundColor: "#fef2f2", 
                    borderLeft: "4px solid #ef4444", 
                    color: "#991b1b",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "16px"
                  }}
                  className="animate-fade-in"
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: "18px", color: "#ef4444" }}></i>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>ระบุ PIN ไม่สำเร็จ</div>
                      <div style={{ color: "#7f1d1d", fontSize: "13px" }}>{bidError || "ใส่รหัสไม่ถูกต้อง ติดต่อ admin เพื่อขอรหัส"}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-secondary">รหัสผ่านประมูล (PIN)</label>
                  <input
                    type="password"
                    name="pin"
                    id="bid-pin-input"
                    className="form-control form-control-custom"
                    placeholder="กรอก PIN ของคุณ..."
                    required
                    autoComplete="off"
                    disabled={submittingBid}
                  />
                  <div className="form-text text-secondary mt-1">รหัสความปลอดภัยที่ออกโดยแอดมิน เพื่อใช้ระบุตัวตนในการเสนอราคา</div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">ดอกเบี้ยประมูลที่เสนอ (บาท)</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control form-control-custom"
                    placeholder="เช่น 250"
                    min={200}
                    required
                    disabled={submittingBid}
                  />
                  <div className="form-text text-secondary mt-1">กำหนดขั้นต่ำห้ามต่ำกว่า 200 บาท เสนอได้เพียง 1 ครั้งในงวดนี้</div>
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" disabled={submittingBid}>ยกเลิก</button>
                <button type="submit" className="btn btn-cyber" disabled={submittingBid}>
                  {submittingBid ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span> กำลังส่ง...</>
                  ) : (
                    "ส่งเสนอราคา"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="addMemberModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog">
          <form action="/api/members/add" method="POST">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title"><i className="bi bi-person-plus-fill me-2 text-cyan"></i>เพิ่มสมาชิกใหม่</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label text-secondary">ชื่อ - นามสกุล</label>
                  <input type="text" name="name" className="form-control form-control-custom" placeholder="กรอกชื่อ-นามสกุล..." required />
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    name="phone"
                    className="form-control form-control-custom"
                    placeholder="กรอกเบอร์โทรศัพท์ เช่น 082-222-3333"
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      const clean = target.value.replace(/\D/g, "");
                      let formatted = "";
                      if (clean.length <= 3) formatted = clean;
                      else if (clean.length <= 6) formatted = clean.substring(0, 3) + "-" + clean.substring(3);
                      else formatted = clean.substring(0, 3) + "-" + clean.substring(3, 6) + "-" + clean.substring(6, 10);
                      target.value = formatted;
                    }}
                    maxLength={12}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">รหัสผ่านประมูล (PIN)</label>
                  <input type="text" name="bid_password" className="form-control form-control-custom" placeholder="กรอกรหัส PIN เช่น 1234" required />
                  <div className="form-text text-secondary mt-1">รหัสความปลอดภัยสำหรับสมาชิกลงคะแนนเสนอราคาประมูลแชร์</div>
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" className="btn btn-cyber">บันทึก</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="editMemberModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog">
          <form action="/api/members/update" method="POST">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title"><i className="bi bi-pencil-square me-2 text-cyan"></i>แก้ไขข้อมูลสมาชิก</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <input type="hidden" name="id" id="edit-id" />
                <div className="mb-3">
                  <label className="form-label text-secondary">ชื่อ - นามสกุล</label>
                  <input type="text" name="name" id="edit-name" className="form-control form-control-custom" required />
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    name="phone"
                    id="edit-phone"
                    className="form-control form-control-custom"
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      const clean = target.value.replace(/\D/g, "");
                      let formatted = "";
                      if (clean.length <= 3) formatted = clean;
                      else if (clean.length <= 6) formatted = clean.substring(0, 3) + "-" + clean.substring(3);
                      else formatted = clean.substring(0, 3) + "-" + clean.substring(3, 6) + "-" + clean.substring(6, 10);
                      target.value = formatted;
                    }}
                    maxLength={12}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">รหัสผ่านประมูล (PIN)</label>
                  <input type="text" name="bid_password" id="edit-bid-password" className="form-control form-control-custom" required />
                </div>
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" name="has_received_share" id="edit-has-received" />
                  <label className="form-check-label" htmlFor="edit-has-received">ได้รับแชร์แล้ว (ประมูลชนะแล้ว)</label>
                </div>
                <div className="mb-3" id="edit-interest-container" style={{ display: "none" }}>
                  <label className="form-label text-secondary">ดอกเบี้ยประมูล (บาท)</label>
                  <input type="number" name="interest_amount" id="edit-interest" className="form-control form-control-custom" min={0} />
                </div>
                <div className="row" id="edit-received-date-container" style={{ display: "none" }}>
                  <div className="col-6 mb-3">
                    <label className="form-label text-secondary">เดือนที่ได้รับแชร์</label>
                    <select name="received_month" id="edit-received-month" className="form-select form-control-custom">
                      {data.ThaiMonths.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label text-secondary">ปีที่ได้รับแชร์ (ค.ศ.)</label>
                    <input type="number" name="received_year" id="edit-received-year" className="form-control form-control-custom" min={2000} max={2100} />
                  </div>
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" className="btn btn-cyber">บันทึกการแก้ไข</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="deleteMemberModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog">
          <form action="/api/members/delete" method="POST">
            <div className="modal-content modal-content-custom border-danger">
              <div className="modal-header modal-header-custom border-danger">
                <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>ยืนยันการลบสมาชิก</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4 text-center">
                <input type="hidden" name="id" id="delete-id" />
                <p className="fs-5">คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิก <br /><strong id="delete-name-span" className="text-cyan">--</strong>?</p>
                <p className="text-secondary fs-7"><i className="bi bi-info-circle me-1"></i> ประวัติการชำระเงินทั้งหมดของสมาชิกท่านนี้จะถูกลบออกถาวร</p>
              </div>
              <div className="modal-footer modal-footer-custom border-danger">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" className="btn btn-danger">ยืนยันการลบ</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="winnerModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog">
          <form action="/api/winners/save" method="POST">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title"><i className="bi bi-award-fill me-2 text-warning"></i>บันทึกผู้ได้รับแชร์ (บิดชนะ)</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <input type="hidden" name="month" value={data.Month} />
                <input type="hidden" name="year" value={data.Year} />
                <div className="mb-3">
                  <label className="form-label text-secondary">เลือกสมาชิกที่บิดแชร์ได้</label>
                  <select name="member_id" className="form-select form-control-custom" defaultValue="" required>
                    <option value="" disabled>-- เลือกสมาชิก --</option>
                    {data.Rows.filter((r) => !r.Member.HasReceivedShare).map((r) => (
                      <option key={r.Member.ID} value={r.Member.ID}>{r.Member.Name}</option>
                    ))}
                  </select>
                  <div className="form-text text-secondary mt-1">แสดงเฉพาะผู้ที่ยังไม่เคยได้รับแชร์เท่านั้น</div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">จำนวนดอกเบี้ยประมูล (บาท)</label>
                  <input type="number" name="interest_amount" className="form-control form-control-custom" placeholder="เช่น 200" min={0} required />
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" className="btn btn-warning text-dark fw-bold">บันทึกผู้รับแชร์</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="settingsModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog">
          <form action="/api/settings/update" method="POST">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title"><i className="bi bi-gear-fill me-2 text-cyan"></i>ตั้งค่าค่าส่งรายเดือน</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-4 p-3 bg-dark-subtle rounded-3 border border-secondary-subtle">
                  <div className="form-check form-switch m-0">
                    <input
                      type="checkbox"
                      name="auction_active"
                      id="settings-auction-active"
                      className="form-check-input"
                      defaultChecked={data.Setting.AuctionActive !== false}
                    />
                    <label className="form-check-label text-dark fw-bold" htmlFor="settings-auction-active">
                      เปิดระบบเสนอราคาประมูลแชร์ (เปิดใช้งานระบบ)
                    </label>
                  </div>
                  <div className="form-text text-secondary mt-1">หากติ๊กออก ระบบเสนอราคาจะถูกปิดใช้งานทันทีและล็อกปุ่มทั้งหมด</div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">จำนวนเงินค่าส่งแชร์พื้นฐาน (บาท / สมาชิก / เดือน)</label>
                  <input type="number" name="monthly_amount" defaultValue={data.Setting.MonthlyAmount} className="form-control form-control-custom" min={1} required />
                  <div className="form-text text-secondary mt-1">ค่าเริ่มต้นคือ 1,000 บาท สามารถเปลี่ยนได้ที่นี่</div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">เวลาเริ่มต้นการประมูลเสนอราคางวดนี้</label>
                  <input type="datetime-local" name="auction_start" id="settings-auction-start" className="form-control form-control-custom" />
                  <div className="form-text text-secondary mt-1">กำหนดวันและเวลาที่จะเริ่มเปิดให้สมาชิกเสนอราคาได้</div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">เวลาสิ้นสุดการประมูลเสนอราคางวดนี้</label>
                  <input type="datetime-local" name="auction_deadline" id="settings-auction-deadline" className="form-control form-control-custom" />
                  <div className="form-text text-secondary mt-1">กำหนดวันเวลาที่หมดเขตประมูล (สมาชิกลูกแชร์ที่ยังไม่ได้รับแชร์จะไม่สามารถประมูลได้หลังจากเวลานี้)</div>
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" className="btn btn-cyber">บันทึกค่า</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="loginModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <form onSubmit={handleLoginSubmit} className="m-0 w-100">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title"><i className="bi bi-lock-fill me-2 text-cyan"></i>เข้าสู่ระบบ Admin</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" disabled={submittingLogin}></button>
              </div>
              <div className="modal-body p-4">
                {/* Tailwind-style Error Popup Card */}
                {loginError && (
                  <div
                    className="animate-fade-in"
                    style={{
                      backgroundColor: "#fef2f2",
                      borderLeft: "4px solid #ef4444",
                      color: "#991b1b",
                      padding: "14px 16px",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginBottom: "16px",
                      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <i className="bi bi-shield-exclamation-fill" style={{ fontSize: "20px", color: "#ef4444", lineHeight: 1.2 }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "15px", color: "#b91c1c" }}>
                          เข้าสู่ระบบไม่สำเร็จ
                        </div>
                        <div style={{ color: "#7f1d1d", fontSize: "13px", lineHeight: 1.4 }}>{loginError}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoginError(null)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#dc2626",
                          fontSize: "18px",
                          lineHeight: 1,
                          cursor: "pointer",
                          padding: "0 2px",
                          fontWeight: 300,
                          flexShrink: 0,
                        }}
                        aria-label="ปิด"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label text-secondary">ชื่อผู้ใช้ (Username)</label>
                  <input type="text" name="username" className="form-control form-control-custom" placeholder="admin" required disabled={submittingLogin} />
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary">รหัสผ่าน (Password)</label>
                  <input type="password" name="password" id="login-password-input" className="form-control form-control-custom" placeholder="admin" required disabled={submittingLogin} />
                </div>
                <div className="form-text text-secondary mt-1 text-center">ชื่อผู้ใช้: admin / รหัสผ่าน: admin</div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" disabled={submittingLogin}>ยกเลิก</button>
                <button type="submit" className="btn btn-cyber" disabled={submittingLogin}>
                  {submittingLogin ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span> กำลังเข้าสู่ระบบ...</>
                  ) : (
                    <><i className="bi bi-box-arrow-in-right me-1"></i>เข้าสู่ระบบ</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="resetPaymentModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <form action="/api/payments/reset" method="POST" className="m-0 w-100">
            <input type="hidden" name="month" value={data.Month} />
            <input type="hidden" name="year" value={data.Year} />
            <div className="modal-content modal-content-custom border-danger">
              <div className="modal-header modal-header-custom border-danger">
                <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>ยืนยันการรีเซ็ตการชำระเงิน</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4 text-center">
                <p className="fs-5">คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตสถานะชำระเงินของงวด <br /><strong className="text-cyan">{data.ThaiMonthName} {data.Year}</strong> ทั้งหมด?</p>
                <p className="text-secondary fs-7"><i className="bi bi-info-circle me-1"></i> สมาชิกทุกคนในงวดนี้จะถูกเปลี่ยนสถานะเป็น &quot;ยังไม่ชำระ&quot; และเวลาชำระเงินเดิมจะถูกลบออกทั้งหมด</p>
              </div>
              <div className="modal-footer modal-footer-custom border-danger">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" className="btn btn-danger">ยืนยันการรีเซ็ต</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="modal fade" id="summaryModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content modal-content-custom">
            <div className="modal-header modal-header-custom">
              <h5 className="modal-title">
                <i className="bi bi-bar-chart-line-fill me-2 text-warning"></i>สรุปผลการเก็บเงินรายปี {data.Year}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4">
              <div className="table-responsive">
                <table className="table table-custom">
                  <thead>
                    <tr>
                      <th>เดือน</th>
                      <th style={{ textAlign: "center" }}>จ่ายแล้ว</th>
                      <th style={{ textAlign: "right" }}>เงินต้น</th>
                      <th style={{ textAlign: "right" }}>ดอกเบี้ย</th>
                      <th style={{ textAlign: "right" }}>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.YearlySummaries.map((s, i) => (
                      <tr key={i}>
                        <td>{s.MonthName}</td>
                        <td style={{ textAlign: "center" }}>{s.PaidCount}/{s.TotalMembers}</td>
                        <td style={{ textAlign: "right" }} className="text-info">{s.PrincipalMoney.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</td>
                        <td style={{ textAlign: "right" }} className="text-warning">{s.InterestMoney.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</td>
                        <td style={{ textAlign: "right" }} className="fw-bold">{s.TotalMoney.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "rgba(2, 132, 199, 0.05)" }}>
                      <th>รวมทั้งปี</th>
                      <th></th>
                      <th style={{ textAlign: "right" }} className="text-info">{data.YearlyTotalPrincipal.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</th>
                      <th style={{ textAlign: "right" }} className="text-warning">{data.YearlyTotalInterest.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</th>
                      <th style={{ textAlign: "right" }} className="text-success">{data.YearlyTotalCollected.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="auctionStatusModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content modal-content-custom">
            <div className="modal-header modal-header-custom">
              <h5 className="modal-title" id="auction-status-title">
                <i className="bi bi-info-circle-fill me-2 text-warning"></i>สถานะการประมูล
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4 text-center">
              <p className="fs-6" id="auction-status-message"></p>
            </div>
            <div className="modal-footer modal-footer-custom justify-content-center">
              <button type="button" className="btn btn-cyber" data-bs-dismiss="modal">ตกลง</button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Slip Modal */}
      <div className="modal fade" id="uploadSlipModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <form onSubmit={handleUploadSlipSubmit}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title">
                  <i className="bi bi-upload me-2 text-cyan"></i>ยืนยันตัวตนเพื่ออัพโหลดสลิป
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" disabled={submittingSlip}></button>
              </div>
              <div className="modal-body p-4">
                <input type="hidden" name="member_id" id="upload-slip-member-id" />
                <input type="hidden" name="month" value={data.Month} />
                <input type="hidden" name="year" value={data.Year} />

                <div className="mb-3 text-center py-2 bg-secondary bg-opacity-10 rounded">
                  <span className="text-secondary fs-7">อัพโหลดสลิปสำหรับสมาชิก: </span>
                  <strong className="text-dark fs-6" id="upload-slip-member-name">-</strong>
                </div>

                {/* Error Banner */}
                <div 
                  id="upload-slip-pin-error" 
                  style={{ 
                    display: uploadSlipError ? "block" : "none", 
                    backgroundColor: "#fef2f2", 
                    borderLeft: "4px solid #ef4444", 
                    color: "#991b1b",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "16px"
                  }}
                  className="animate-fade-in"
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: "18px", color: "#ef4444" }}></i>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>ระบุ PIN ไม่สำเร็จ</div>
                      <div style={{ color: "#7f1d1d", fontSize: "13px" }}>{uploadSlipError || "ใส่รหัสไม่ถูกต้อง ติดต่อ admin เพื่อขอรหัส"}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-secondary">รหัสผ่านประมูล (PIN)</label>
                  <input
                    type="password"
                    name="pin"
                    id="upload-slip-pin-input"
                    className="form-control form-control-custom"
                    placeholder="กรอก PIN 4 หลักของคุณ..."
                    required
                    autoComplete="off"
                    disabled={submittingSlip}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label text-secondary">ไฟล์รูปภาพสลิป</label>
                  <input
                    type="file"
                    name="slip"
                    id="upload-slip-file-input"
                    className="form-control form-control-custom"
                    accept="image/*"
                    required
                    disabled={submittingSlip}
                  />
                  <div className="form-text text-secondary mt-1">รองรับไฟล์รูปภาพ JPG, PNG, WEBP ขนาดไม่เกิน 5MB</div>
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" disabled={submittingSlip}>ยกเลิก</button>
                <button type="submit" className="btn btn-cyber" disabled={submittingSlip}>
                  {submittingSlip ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span> กำลังอัพโหลด...</>
                  ) : (
                    "ยืนยันและอัพโหลด"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Member Info Modal (Admin view only) */}
      <div className="modal fade" id="memberInfoModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <form action="/api/members/update-info" method="POST">
            <div className="modal-content modal-content-custom border-primary">
              <div className="modal-header modal-header-custom border-primary">
                <h5 className="modal-title text-primary fw-bold">
                  <i className="bi bi-person-badge-fill me-2"></i>ข้อมูลผู้ใช้: <span id="info-name-label" className="text-dark">-</span>
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <input type="hidden" name="id" id="info-id" />

                <div className="row g-3">
                  {/* ชื่อในวง */}
                  <div className="col-12">
                    <label className="form-label text-secondary fs-7">ชื่อในวงแชร์ (Name)</label>
                    <input type="text" name="name" id="info-name" className="form-control form-control-custom" required />
                  </div>

                  {/* ชื่อจริง & นามสกุล */}
                  <div className="col-6">
                    <label className="form-label text-secondary fs-7">ชื่อจริง (First Name)</label>
                    <input type="text" name="first_name" id="info-first-name" className="form-control form-control-custom" placeholder="ชื่อจริง..." />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-secondary fs-7">นามสกุล (Last Name)</label>
                    <input type="text" name="last_name" id="info-last-name" className="form-control form-control-custom" placeholder="นามสกุล..." />
                  </div>

                  {/* เบอร์โทรศัพท์ */}
                  <div className="col-12">
                    <label className="form-label text-secondary fs-7">เบอร์โทรศัพท์ (Phone)</label>
                    <input type="text" name="phone" id="info-phone" className="form-control form-control-custom" placeholder="เบอร์โทรศัพท์..." />
                  </div>

                  {/* ธนาคาร & หมายเลขบัญชี */}
                  <div className="col-6">
                    <label className="form-label text-secondary fs-7">ธนาคาร (Bank Name)</label>
                    <input type="text" name="bank_name" id="info-bank-name" className="form-control form-control-custom" placeholder="เช่น กสิกรไทย, ไทยพาณิชย์" />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-secondary fs-7">หมายเลขบัญชี (Account No.)</label>
                    <input type="text" name="account_number" id="info-account-number" className="form-control form-control-custom" placeholder="หมายเลขบัญชีธนาคาร..." />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-light rounded text-secondary fs-8">
                  <i className="bi bi-shield-lock-fill me-1 text-primary"></i> ข้อมูลนี้เป็นความลับเฉพาะแอดมินเท่านั้นที่จะสามารถเปิดดูและแก้ไขได้
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">ปิด</button>
                <button type="submit" className="btn btn-cyber">บันทึกข้อมูล</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
