import React, { useRef } from 'react'
import Barcode from 'react-barcode'

interface ProductLabelPrintProps {
  productName: string
  barcode: string
  sellingPrice: string
  sku?: string
}

/** Truncate long product names for compact sticker (max ~22 chars for readability) */
function truncateName(name: string, maxLen: number = 22): string {
  const trimmed = name.trim()
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.slice(0, maxLen - 2) + '...'
}

export default function ProductLabelPrint({ productName, barcode, sellingPrice, sku }: ProductLabelPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const shortName = truncateName(productName, 22)

  return (
    <div className="product-label-print" ref={printRef}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .product-label-print, .product-label-print * { visibility: visible; }
          .product-label-print { position: absolute; left: 0; top: 0; }
        }
        .product-label-print {
          width: 60mm;
          min-height: 45mm;
          padding: 6px;
          border: 1px dashed #ccc;
          font-family: 'Segoe UI', 'Tahoma', Arial, sans-serif;
          direction: rtl;
          text-align: right;
          box-sizing: border-box;
        }
        .product-label-print .label-name { font-size: 11px; font-weight: bold; margin-bottom: 4px; line-height: 1.3; word-break: break-word; }
        .product-label-print .label-price { font-size: 15px; font-weight: bold; color: #c00; margin: 4px 0; }
        .product-label-print .label-sku { font-size: 9px; color: #666; margin-top: 2px; }
        .product-label-print svg { max-width: 100%; height: auto !important; }
      `}</style>
      <div className="label-name">{shortName}</div>
      {barcode ? (
        <Barcode value={barcode} format="CODE128" width={1.2} height={28} displayValue={true} fontSize={9} />
      ) : (
        <div style={{ fontSize: 9, color: '#999' }}>لا يوجد باركود</div>
      )}
      <div className="label-price">{sellingPrice} ج.م</div>
      {sku && <div className="label-sku">{sku}</div>}
    </div>
  )
}
