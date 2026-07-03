"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QRCodeCanvas({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#071C3D", light: "#ffffff" },
    });
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg"
      aria-label={`QR code for ${value}`}
    />
  );
}
