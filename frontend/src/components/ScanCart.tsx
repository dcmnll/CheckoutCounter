import React, { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface CartItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface CartResponse {
  cart_id: string;
  session_id: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  currency: string;
}

export const ScanCart: React.FC = () => {
  const [manualSessionId, setManualSessionId] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedSessionId, setScannedSessionId] = useState<string | null>(null);
  const [cartData, setCartData] = useState<CartResponse | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Pattern: SHOP-YYYYMMDD-XXXX (e.g. SHOP-20260928-0007)
  const SESSION_REGEX = /^SHOP-\d{8}-\d{4}$/;

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setVideoDevices(videoInputs);

        if (videoInputs.length > 0) {
          // Prefer built-in/integrated webcam
          const integrated = videoInputs.find((d) =>
            /integrated|internal|built-in|front/i.test(d.label)
          );
          setSelectedDeviceId(integrated ? integrated.deviceId : videoInputs[0].deviceId);
        }
      })
      .catch((err) => {
        setErrorMsg("Failed to list camera devices: " + err.message);
      });

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const startScanning = async () => {
    setErrorMsg(null);
    setCartData(null);
    setIsScanning(true);

    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      await codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId || undefined,
        videoRef.current!,
        (result) => {
          if (result) {
            const rawText = result.getText().trim();

            if (SESSION_REGEX.test(rawText)) {
              setScannedSessionId(rawText);
              stopCamera();
              fetchCart(rawText);
            } else {
              setErrorMsg(`Unrecognized barcode pattern: "${rawText}". Expected: SHOP-YYYYMMDD-XXXX`);
            }
          }
        }
      );
    } catch (err: any) {
      setIsScanning(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission denied. Please allow camera access in browser.");
      } else {
        setErrorMsg("Unable to access camera: " + err.message);
      }
    }
  };

  const fetchCart = async (sessionId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/api/carts/${sessionId}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || `Server error: ${res.status}`);
      }
      const data: CartResponse = await res.json();
      setCartData(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSessionId.trim()) return;
    setScannedSessionId(manualSessionId.trim());
    fetchCart(manualSessionId.trim());
  };

  return (
    <div style={{ maxWidth: "620px", margin: "24px auto", fontFamily: "Segoe UI, sans-serif", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <h2>Scan Cart </h2>

      {/* Camera Selection */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ fontWeight: "bold" }}>Camera Source: </label>
        <select
          value={selectedDeviceId}
          onChange={(e) => {
            setSelectedDeviceId(e.target.value);
            if (isScanning) stopCamera();
          }}
          disabled={isScanning}
          style={{ padding: "6px 8px", marginLeft: "6px" }}
        >
          {videoDevices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>
      </div>

      {/* Video Viewport */}
      <div style={{ border: "2px dashed #aaa", borderRadius: "6px", padding: "10px", textAlign: "center", background: "#fcfcfc" }}>
        <video
          ref={videoRef}
          style={{ width: "100%", maxHeight: "250px", background: "#111", borderRadius: "4px", display: isScanning ? "block" : "none" }}
        />
        {!isScanning && (
          <div style={{ padding: "30px 0", color: "#666" }}>
            Camera is currently off. Click below to start scanner.
          </div>
        )}
        <div style={{ marginTop: "10px" }}>
          {!isScanning ? (
            <button onClick={startScanning} style={{ padding: "8px 18px", background: "#0078D4", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>
              Start Camera Scanner
            </button>
          ) : (
            <button onClick={stopCamera} style={{ padding: "8px 18px", background: "#D83B01", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>
              Stop Camera
            </button>
          )}
        </div>
      </div>

      {/* Manual Fallback */}
      <div style={{ marginTop: "20px", padding: "15px", background: "#f5f5f5", borderRadius: "6px" }}>
        <h4 style={{ margin: "0 0 10px 0" }}>Manual Fallback</h4>
        <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="e.g. SHOP-20260928-0007"
            aria-label="Session ID"
            value={manualSessionId}
            onChange={(e) => setManualSessionId(e.target.value)}
            style={{ flexGrow: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: "8px 18px", background: "#107C41", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>
            Load Cart
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div style={{ marginTop: "15px", padding: "10px", background: "#fde7e9", color: "#a80000", borderRadius: "4px", border: "1px solid #f19999" }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Scanned / Decoded Session */}
      {scannedSessionId && (
        <div style={{ marginTop: "15px", padding: "8px 12px", background: "#eff6fc", borderRadius: "4px", borderLeft: "4px solid #0078D4" }}>
          <strong>Active Session ID:</strong> <code>{scannedSessionId}</code>
        </div>
      )}

      {/* Cart Items Table */}
      {cartData && (
        <div style={{ marginTop: "20px", borderTop: "2px solid #ddd", paddingTop: "15px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Cart: {cartData.cart_id}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#eee" }}>
                <th style={{ padding: "8px" }}>Item</th>
                <th style={{ padding: "8px" }}>Qty</th>
                <th style={{ padding: "8px" }}>Unit Price</th>
                <th style={{ padding: "8px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {cartData.items.map((it) => (
                <tr key={it.product_id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>{it.name}</td>
                  <td style={{ padding: "8px" }}>{it.quantity}</td>
                  <td style={{ padding: "8px" }}>{it.unit_price.toFixed(2)}</td>
                  <td style={{ padding: "8px" }}>{it.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "right", marginTop: "14px" }}>
            <div>Subtotal: <strong>{cartData.subtotal.toFixed(2)} {cartData.currency}</strong></div>
            <div style={{ fontSize: "1.25rem", marginTop: "4px" }}>
              Total: <strong>{cartData.total.toFixed(2)} {cartData.currency}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};