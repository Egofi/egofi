"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";

/** Renders `value` as a QR canvas. Used in the order-details view. */
export function QRCodeCanvas({ value, size = 148 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    void QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#071C3D", light: "#ffffff" },
    });
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg" aria-label="Payment QR code" />;
}
