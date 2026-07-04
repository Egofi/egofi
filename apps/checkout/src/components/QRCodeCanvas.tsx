"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";

export function QRCodeCanvas({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      // High EC so the center asset badge overlay doesn't break scanning.
      errorCorrectionLevel: "H",
      color: { dark: "#071C3D", light: "#ffffff" },
    });
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg" aria-label={`QR code for ${value}`} />;
}
