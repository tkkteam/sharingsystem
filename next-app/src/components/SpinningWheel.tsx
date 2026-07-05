"use client";

import { useEffect, useRef, useState } from "react";
import type { IndexData } from "@/lib/types";

interface Props {
  data: IndexData;
}

const SEGMENT_COLORS = [
  "#3b82f6", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#f43f5e", "#14b8a6", "#0284c7", "#16a34a",
];

export default function SpinningWheel({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [winnerName, setWinnerName] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const isSpinningRef = useRef(false);
  const isDeceleratingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const eligible = data.Rows.filter((r) => !r.Member.HasReceivedShare);

  useEffect(() => {
    setNames(eligible.map((r) => r.Member.Name));
    setIds(eligible.map((r) => String(r.Member.ID)));
  }, [data.Rows]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = (w - 20) / 2;

    ctx.clearRect(0, 0, w, h);
    const n = names.length;
    if (n === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "16px Prompt, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ไม่มีสมาชิกให้สุ่ม", cx, cy);
      return;
    }

    const arc = (2 * Math.PI) / n;
    for (let i = 0; i < n; i++) {
      const a = angleRef.current + i * arc;
      ctx.beginPath();
      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a, a + arc);
      ctx.lineTo(cx, cy);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Prompt, sans-serif";
      ctx.textAlign = "right";
      ctx.translate(cx, cy);
      ctx.rotate(a + arc / 2);
      let text = names[i];
      if (text.length > 10) text = text.substring(0, 9) + "..";
      ctx.fillText(text, radius - 15, 4);
      ctx.restore();
    }

    // center pin
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 6;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.15)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1e293b";
    ctx.font = "14px Prompt, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎲", cx, cy + 6);
  };

  // redraw when names change or modal opens
  useEffect(() => {
    const modalEl = document.getElementById("randomWinnerModal");
    if (!modalEl) return;
    const handler = () => {
      angleRef.current = 0;
      speedRef.current = 0;
      isSpinningRef.current = false;
      isDeceleratingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      drawWheel();
    };
    modalEl.addEventListener("shown.bs.modal", handler);
    return () => modalEl.removeEventListener("shown.bs.modal", handler);
  }, [names.length]);

  // initial draw
  useEffect(() => {
    drawWheel();
  }, [names]);

  const animate = () => {
    if (!isSpinningRef.current) return;
    angleRef.current += speedRef.current;
    if (isDeceleratingRef.current) {
      speedRef.current *= 0.982;
      if (speedRef.current < 0.003) {
        isSpinningRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        const n = names.length;
        const arc = (2 * Math.PI) / n;
        let norm = (3 * Math.PI / 2 - angleRef.current) % (2 * Math.PI);
        if (norm < 0) norm += 2 * Math.PI;
        const idx = Math.floor(norm / arc) % n;
        const wName = names[idx];
        const wId = ids[idx];
        setWinnerName(wName);
        setWinnerId(wId);

        const spinModalEl = document.getElementById("randomWinnerModal");
        if (spinModalEl && window.bootstrap) {
          const sm = window.bootstrap.Modal.getInstance(spinModalEl);
          if (sm) sm.hide();
        }
        setTimeout(() => {
          const congratsEl = document.getElementById("congratsModal");
          if (congratsEl && window.bootstrap) {
            const cm = window.bootstrap.Modal.getInstance(congratsEl) || new window.bootstrap.Modal(congratsEl);
            cm.show();
          }
        }, 400);
        return;
      }
    }
    drawWheel();
    rafRef.current = requestAnimationFrame(animate);
  };

  const startSpin = () => {
    if (names.length === 0) {
      alert("ไม่มีรายชื่อสมาชิกที่สามารถสุ่มได้ (เนื่องจากได้รับแชร์ครบทุกคนแล้ว)");
      return;
    }
    isSpinningRef.current = true;
    isDeceleratingRef.current = false;
    speedRef.current = 0.35 + Math.random() * 0.2;
    (document.getElementById("spin-start-btn") as HTMLButtonElement).disabled = true;
    (document.getElementById("spin-stop-btn") as HTMLButtonElement).disabled = false;
    animate();
  };

  const stopSpin = () => {
    isDeceleratingRef.current = true;
    (document.getElementById("spin-stop-btn") as HTMLButtonElement).disabled = true;
  };

  const submitWinner = () => {
    (document.getElementById("lottery-form") as HTMLFormElement).submit();
  };

  return (
    <>
      {/* Spinning Wheel Modal */}
      <div className="modal fade" id="randomWinnerModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content modal-content-custom border-warning">
            <div className="modal-header modal-header-custom border-warning">
              <h5 className="modal-title text-warning fw-bold"><i className="bi bi-shuffle me-2"></i>วงล้อสุ่มจับฉลากผู้ได้รับแชร์</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4 text-center">
              <p className="text-secondary fs-7 mb-2">สุ่มเลือกผู้ที่ยังไม่ได้แชร์โดยคิดดอกเบี้ยที่ 200 บาท</p>
              <div className="position-relative d-inline-block my-3" style={{ width: 310, height: 310 }}>
                <div
                  className="position-absolute"
                  style={{
                    top: -12, left: "50%", transform: "translateX(-50%)", zIndex: 10, width: 0, height: 0,
                    borderLeft: "15px solid transparent", borderRight: "15px solid transparent",
                    borderTop: "25px solid var(--accent-red)",
                    filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))",
                  }}
                ></div>
                <canvas ref={canvasRef} width={300} height={300} className="rounded-circle shadow-sm" style={{ border: "6px solid #ffffff", backgroundColor: "#fff" }}></canvas>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button type="button" id="spin-start-btn" className="btn btn-warning text-dark fw-bold flex-grow-1 py-3 fs-5" onClick={startSpin}>
                  <i className="bi bi-play-circle-fill me-2"></i> เริ่มหมุนวงล้อ
                </button>
                <button type="button" id="spin-stop-btn" className="btn btn-danger text-white fw-bold flex-grow-1 py-3 fs-5" onClick={stopSpin} disabled>
                  <i className="bi bi-stop-circle-fill me-2"></i> กดหยุดหมุน
                </button>
              </div>
              <form id="lottery-form" action="/api/winners/save" method="POST" style={{ display: "none" }}>
                <input type="hidden" name="member_id" id="lottery-winner-id" value={winnerId} />
                <input type="hidden" name="interest_amount" value="200" />
                <input type="hidden" name="month" value={data.Month} />
                <input type="hidden" name="year" value={data.Year} />
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Congrats Modal */}
      <div className="modal fade" id="congratsModal" tabIndex={-1} aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content modal-content-custom border-warning" style={{ background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)" }}>
            <div className="modal-body p-5 text-center position-relative overflow-hidden">
              <div className="fs-1 mb-2">🎉 🏆 🎉</div>
              <h1 className="fw-bold text-warning mb-2" style={{ fontSize: "2.6rem", textShadow: "0 2px 4px rgba(245, 158, 11, 0.2)" }}>ยินดีด้วย!</h1>
              <p className="text-secondary fs-6">สุ่มได้ผู้รับแชร์ประจำงวดนี้</p>
              <div className="glass-card p-4 my-4" style={{ background: "rgba(255, 255, 255, 0.95)", border: "2.5px solid var(--accent-orange)", boxShadow: "0 12px 35px -5px rgba(245, 158, 11, 0.35)" }}>
                <h2 id="congrats-winner-name" className="fw-bold text-cyan mb-0" style={{ fontSize: "2.2rem", lineHeight: 1.4 }}>{winnerName || "-"}</h2>
              </div>
              <p className="text-secondary fs-7 mb-4"><i className="bi bi-info-circle me-1"></i>ระบบจะทำการบันทึกยอดเงินรับแชร์พร้อมดอกเบี้ย 200 บาท</p>
              <button type="button" className="btn btn-warning text-dark fw-bold w-100 py-3 fs-5" onClick={submitWinner}>
                <i className="bi bi-check-circle-fill me-2"></i> บันทึกผลรับแชร์
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
