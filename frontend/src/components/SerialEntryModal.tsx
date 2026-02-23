import React, { useState } from 'react'
import { api } from '../api/client'
import Modal from './Modal'

interface SerialEntryModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  productId: number
  productName: string
  branchId: number
  branchName: string
  expectedCount: number
}

export default function SerialEntryModal({
  open,
  onClose,
  onSaved,
  productId,
  productName,
  branchId,
  branchName,
  expectedCount,
}: SerialEntryModalProps) {
  const [serialsText, setSerialsText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const lines = serialsText
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const enteredCount = lines.length
  const duplicates = lines.filter((s, i) => lines.indexOf(s) !== i)
  const uniqueDuplicates = [...new Set(duplicates)]
  const isValid = enteredCount === expectedCount && uniqueDuplicates.length === 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError('')
    api
      .post('/inventory/product-serials/bulk-create/', {
        product_id: productId,
        branch_id: branchId,
        serial_numbers: lines,
      })
      .then(() => {
        onSaved()
        onClose()
        setSerialsText('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'حدث خطأ'))
      .finally(() => setSubmitting(false))
  }

  return (
    <Modal open={open} onClose={onClose} title="إدخال الأرقام المسلسلة" wide>
      <form onSubmit={handleSubmit}>
        <p style={{ marginBottom: 12, color: '#555' }}>
          المنتج: <strong>{productName}</strong> — الفرع: <strong>{branchName}</strong>
        </p>
        <p style={{ marginBottom: 8, fontSize: 14 }}>
          المتوقع: <strong>{expectedCount}</strong> — المدخل: <strong>{enteredCount}</strong>
          {enteredCount !== expectedCount && (
            <span style={{ color: '#c00', marginRight: 8 }}> (يجب أن يتطابق العدد)</span>
          )}
        </p>
        {uniqueDuplicates.length > 0 && (
          <p style={{ color: '#c00', marginBottom: 8, fontSize: 14 }}>
            أرقام مكررة: {uniqueDuplicates.join('، ')}
          </p>
        )}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div className="form-group">
          <label>الأرقام المسلسلة (سطر لكل رقم)</label>
          <textarea
            value={serialsText}
            onChange={(e) => setSerialsText(e.target.value)}
            placeholder={'SN001\nSN002\nSN003'}
            rows={10}
            style={{ fontFamily: 'monospace', direction: 'ltr' }}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إلغاء (أكمل لاحقاً)
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
            {submitting ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
