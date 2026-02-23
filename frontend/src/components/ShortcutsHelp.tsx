interface ShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: 'Ctrl+K', action: 'فتح البحث' },
  { keys: 'Ctrl+N', action: 'إنشاء فاتورة (من المبيعات)' },
  { keys: 'Ctrl+Shift+N', action: 'سند قبض (من الخزينة)' },
  { keys: 'Ctrl+/', action: 'عرض الاختصارات' },
  { keys: 'g ثم h', action: 'الرئيسية' },
  { keys: 'g ثم s', action: 'المبيعات' },
  { keys: 'g ثم p', action: 'المشتريات' },
  { keys: 'g ثم t', action: 'الخزينة' },
  { keys: 'Escape', action: 'إغلاق' },
]

export default function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal shortcuts-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>اختصارات لوحة المفاتيح</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>
        <div className="modal-body">
          <table className="shortcuts-table">
            <tbody>
              {shortcuts.map((s) => (
                <tr key={s.keys}>
                  <td className="shortcuts-keys">
                    <kbd>{s.keys}</kbd>
                  </td>
                  <td>{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
