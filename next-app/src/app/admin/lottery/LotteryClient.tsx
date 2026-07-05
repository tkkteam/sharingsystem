"use client";

import { useEffect, useRef, useState } from "react";
import type { IndexData } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

interface Props {
  data: IndexData;
}

const SEGMENT_COLORS = [
  "#3b82f6", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#f43f5e", "#14b8a6", "#0284c7", "#16a34a",
];

export default function LotteryClient({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [winnerName, setWinnerName] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [showCongrats, setShowCongrats] = useState(false);
  const angleRef = useRef(0);
  const speedRef = useRef(0);
  const isSpinning = useRef(false);
  const isDecelerating = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [spinState, setSpinState] = useState<"idle" | "spinning" | "stopping" | "finished">("idle");

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
    const radius = (w - 30) / 2;

    ctx.clearRect(0, 0, w, h);
    const n = names.length;
    if (n === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 20px Prompt, sans-serif";
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
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Prompt, sans-serif";
      ctx.textAlign = "right";
      ctx.translate(cx, cy);
      ctx.rotate(a + arc / 2);
      let text = names[i];
      if (text.length > 12) text = text.substring(0, 11) + "..";
      ctx.fillText(text, radius - 25, 5);
      ctx.restore();
    }

    // Outer border ring decoration
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Center pin decoration
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.font = "24px Prompt, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎲", cx, cy + 8);
  };

  useEffect(() => {
    drawWheel();
  }, [names]);

  const animate = () => {
    if (!isSpinning.current) return;
    angleRef.current += speedRef.current;
    if (isDecelerating.current) {
      speedRef.current *= 0.985;
      if (speedRef.current < 0.002) {
        isSpinning.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        const n = names.length;
        const arc = (2 * Math.PI) / n;
        let norm = (3 * Math.PI / 2 - angleRef.current) % (2 * Math.PI);
        if (norm < 0) norm += 2 * Math.PI;
        const idx = Math.floor(norm / arc) % n;
        
        setWinnerName(names[idx]);
        setWinnerId(ids[idx]);
        setSpinState("finished");
        setShowCongrats(true);
        return;
      }
    }
    drawWheel();
    rafRef.current = requestAnimationFrame(animate);
  };

  const startSpin = () => {
    if (names.length === 0) return;
    isSpinning.current = true;
    isDecelerating.current = false;
    speedRef.current = 0.4 + Math.random() * 0.2;
    setSpinState("spinning");
    animate();
  };

  const stopSpin = () => {
    isDecelerating.current = true;
    setSpinState("stopping");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: "radial-gradient(circle, #1e293b 0%, #0f172a 100%)" }}>
      {/* Background glowing blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

      {/* Main Container */}
      <div className="w-full max-w-4xl glass-card p-4 md:p-6 text-center z-10 flex flex-col items-center" style={{ background: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "24px" }}>
        
        {/* Header */}
        <div className="mb-4 w-full flex flex-col md:flex-row justify-between items-center gap-3">
          <button 
            type="button" 
            onClick={() => window.close()} 
            className="btn btn-sm btn-outline-light d-flex align-items-center gap-1"
            style={{ borderRadius: "8px", padding: "8px 16px" }}
          >
            <i className="bi bi-arrow-left"></i> กลับหน้าจัดการ
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-1" style={{ background: "linear-gradient(to right, #fbbf24, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              <i className="bi bi-shuffle me-2"></i>วงล้อสุ่มจับฉลากผู้ได้รับแชร์
            </h1>
            <p className="text-secondary mb-0 fs-7 md:fs-6">ประจำงวดประจำเดือน {data.ThaiMonthName} {data.Year} • ดอกเบี้ยสุ่มจับฉลาก 200 ฿</p>
          </div>
          <div style={{ width: "100px" }} className="d-none d-md-block"></div> {/* Spacer for symmetry */}
        </div>

        {/* Wheel Display - Stacked Vertically and Centered */}
        <div className="d-flex flex-column align-items-center w-100 my-4 gap-4">
          
          {/* Wheel Canvas Container */}
          <div className="position-relative d-flex justify-content-center align-items-center" style={{ width: 490, height: 490 }}>
            {/* Pointer Pin at top */}
            <div
              className="position-absolute"
              style={{
                top: -8, left: "50%", transform: "translateX(-50%)", zIndex: 20, width: 0, height: 0,
                borderLeft: "20px solid transparent", borderRight: "20px solid transparent",
                borderTop: "35px solid #ef4444",
                filter: "drop-shadow(0px 3px 6px rgba(0,0,0,0.5))",
              }}
            ></div>
            <canvas 
              ref={canvasRef} 
              width={480} 
              height={480} 
              className="rounded-circle shadow-lg" 
              style={{ 
                border: "10px solid #ffffff", 
                backgroundColor: "#fff",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 50px rgba(59, 130, 246, 0.3)",
              }}
            ></canvas>
          </div>

          {/* Spin Buttons directly below the wheel */}
          <div className="d-flex gap-3 justify-content-center w-100" style={{ maxWidth: "450px" }}>
            <button 
              type="button" 
              className="btn btn-warning text-dark fw-extrabold flex-grow-1 py-3 fs-5 d-flex justify-content-center align-items-center gap-2"
              onClick={startSpin}
              disabled={spinState === "spinning" || spinState === "stopping" || names.length === 0}
              style={{ borderRadius: "12px", boxShadow: "0 6px 20px rgba(245, 158, 11, 0.4)" }}
            >
              <i className="bi bi-play-circle-fill"></i> เริ่มหมุนวงล้อ
            </button>
            <button 
              type="button" 
              className="btn btn-danger text-white fw-extrabold flex-grow-1 py-3 fs-5 d-flex justify-content-center align-items-center gap-2"
              onClick={stopSpin}
              disabled={spinState !== "spinning"}
              style={{ borderRadius: "12px", boxShadow: "0 6px 20px rgba(239, 68, 68, 0.4)" }}
            >
              <i className="bi bi-stop-circle-fill"></i> กดหยุดหมุน
            </button>
          </div>

          {/* Horizontal list of eligible members below */}
          <div className="w-100 mt-2 px-3">
            <h6 className="text-secondary text-center mb-3 fw-bold">
              <i className="bi bi-people-fill me-2"></i>รายชื่อผู้มีสิทธิ์สุ่ม ({names.length} คน)
            </h6>
            <div className="d-flex flex-wrap justify-content-center gap-2" style={{ maxHeight: "150px", overflowY: "auto" }}>
              {names.length > 0 ? (
                names.map((n, idx) => (
                  <span 
                    key={idx} 
                    className="badge bg-secondary bg-opacity-20 text-white px-3 py-2 d-flex align-items-center gap-2"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", fontSize: "14px" }}
                  >
                    <span className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}></span>
                    {n}
                  </span>
                ))
              ) : (
                <div className="text-secondary text-center py-2">ได้รับแชร์ครบทุกคนแล้ว</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Full screen Congratulations overlay */}
      {showCongrats && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backdropFilter: "blur(8px)",
          }}
          className="animate-fade-in"
        >
          <div 
            className="glass-card p-5 text-center" 
            style={{ 
              maxWidth: "500px", 
              width: "100%",
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
              border: "2.5px solid #fbbf24", 
              borderRadius: "24px", 
              boxShadow: "0 25px 70px -10px rgba(245, 158, 11, 0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div className="fs-1 mb-2">🎉 🏆 🎉</div>
            <h1 className="fw-extrabold text-warning mb-2" style={{ fontSize: "3rem", textShadow: "0 0 20px rgba(245, 158, 11, 0.4)" }}>ยินดีด้วย!</h1>
            <p className="text-secondary-subtle fs-6">สุ่มจับฉลากได้รับแชร์ประจำงวดนี้</p>
            
            <div className="glass-card p-4 my-4 w-100 text-center" style={{ background: "rgba(15, 23, 42, 0.6)", border: "2px solid #f97316", borderRadius: "16px", boxShadow: "inset 0 0 20px rgba(249, 115, 22, 0.2)" }}>
              <h2 className="fw-bold text-cyan mb-0" style={{ fontSize: "2.5rem", lineHeight: 1.4, color: "#22d3ee" }}>{winnerName || "-"}</h2>
            </div>
            
            <p className="text-secondary-subtle fs-7 mb-4">
              <i className="bi bi-info-circle me-1"></i>ระบบจะทำการบันทึกผู้ได้รับแชร์ พร้อมดอกเบี้ย 200 บาท เข้างวดประจำเดือนนี้
            </p>
            
            <form action="/api/winners/save" method="POST" className="w-100">
              <input type="hidden" name="member_id" value={winnerId} />
              <input type="hidden" name="interest_amount" value="200" />
              <input type="hidden" name="month" value={data.Month} />
              <input type="hidden" name="year" value={data.Year} />
              <div className="d-flex gap-2 w-100">
                <button type="button" className="btn btn-outline-secondary py-3 flex-grow-1" onClick={() => setShowCongrats(false)} style={{ borderRadius: "12px" }}>
                  ปิดหน้าต่างนี้
                </button>
                <button type="submit" className="btn btn-warning text-dark fw-bold py-3 flex-grow-2 px-4" style={{ borderRadius: "12px", boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)" }}>
                  <i className="bi bi-check-circle-fill me-2"></i> บันทึกผลรับแชร์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
