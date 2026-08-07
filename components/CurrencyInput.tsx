"use client";
import { useEffect, useState } from "react";

/** Format angka menjadi string ribuan Indonesia, mis. 20315000 -> "20.315.000" */
function formatThousands(value: number | string): string {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function toNumber(formatted: string): number {
  const digits = formatted.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Input nominal Rupiah: menampilkan pemisah ribuan penuh (contoh: 20.315.000)
 * secara langsung saat pengguna mengetik, namun tetap mengirim nilai numerik murni
 * (tanpa titik) ke handler onValueChange untuk disimpan/dihitung.
 */
export default function CurrencyInput({
  value,
  onValueChange,
  placeholder,
  min = 0,
}: {
  value: number;
  onValueChange: (n: number) => void;
  placeholder?: string;
  min?: number;
}) {
  const [display, setDisplay] = useState(formatThousands(value));

  useEffect(() => {
    setDisplay(formatThousands(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="currency-input">
      <span className="currency-prefix">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder || "0"}
        onChange={(e) => {
          const formatted = formatThousands(e.target.value);
          setDisplay(formatted);
          const n = Math.max(min, toNumber(formatted));
          onValueChange(n);
        }}
      />
    </div>
  );
}
