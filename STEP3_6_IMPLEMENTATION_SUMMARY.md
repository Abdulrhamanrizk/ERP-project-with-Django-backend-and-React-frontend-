# STEP 3–6 — Implementation Summary

## STEP 3 — Opening Stock Flow Hardening

### Backend
- **StockMovement:** Added `opening_balance` movement type
- **ProductWriteSerializer:** Use `opening_balance` instead of `in` for opening stock
- **Validation:** Branch exists, is_active; Branch.DoesNotExist handled
- **sales/services.py:** IN_TYPES includes `opening_balance` for get_stock()

### Frontend
- **Products.tsx:** `useBranch()` — default `opening_branch_id` from `currentBranchId` or single branch
- **Warehouse.tsx:** IN_TYPES + MOVEMENT_LABELS include `opening_balance`

---

## STEP 4 — Serial Flow Hardening

### Backend
- **ProductSerialViewSet:** New action `bulk-create` (POST `/inventory/product-serials/bulk-create/`)
- Validates: product_id, branch_id, serial_numbers (list)
- Checks: product.track_serial, branch belongs to org
- Rejects: duplicates in input, existing serials in DB

### Frontend
- **SerialEntryModal:** New component for serial entry
- Multi-line textarea (one serial per line)
- Shows: expected count vs entered count
- Detects duplicates in input
- Save calls bulk-create API

### Integration
- After product create with track_serial + opening_stock → auto-open SerialEntryModal

---

## STEP 5 — Product List UX Polish

- **Empty state:** Different message when search returns 0 vs no products
- **Status badges:** Serial (badge-info/badge-muted), Active (badge-success/badge-muted)
- **CSS:** Added .badge-success, .badge-info, .badge-muted

---

## STEP 6 — Edge Cases + Test Checklist

### Backend validation
- Opening quantity must be integer when track_serial

### Manual test checklist
- `MANUAL_TEST_CHECKLIST.md` — Arabic checklist for store staff

---

## Files Changed

| File |
|------|
| backend/apps/inventory/models/stock_movement.py |
| backend/apps/inventory/serializers.py |
| backend/apps/inventory/views.py |
| backend/apps/sales/services.py |
| frontend/src/pages/Products.tsx |
| frontend/src/pages/Warehouse.tsx |
| frontend/src/components/SerialEntryModal.tsx (new) |
| frontend/src/styles/index.css |
| MANUAL_TEST_CHECKLIST.md (new) |
| STEP3_6_IMPLEMENTATION_SUMMARY.md (new) |
