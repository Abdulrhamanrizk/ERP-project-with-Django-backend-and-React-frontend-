# STEP 2 — Barcode + Label Print Hardening

## A) Impacted Files

| File | Change |
|------|--------|
| `backend/apps/inventory/models/product.py` | Added UniqueConstraint on barcode (when not empty) |
| `backend/apps/inventory/migrations/0004_product_barcode_unique.py` | Migration for barcode constraint |
| `frontend/src/components/ProductLabelPrint.tsx` | Removed auto-print, improved layout |
| `frontend/src/pages/Products.tsx` | "معاينة اللابل" title, Print from edit button |

## B) Assumptions

- Existing products with duplicate non-empty barcodes will cause migration to fail; fix duplicates before migrating
- Empty barcode (`''`) is allowed for multiple products (constraint excludes empty)
- Print button in label modal is sufficient; no auto-print on open

## C) Backend Changes

1. **Product model:** `UniqueConstraint` on `barcode` with `condition=~Q(barcode='')`
2. **Migration 0004:** Adds the constraint `product_barcode_unique_when_not_empty`

## D) Frontend Changes

1. **ProductLabelPrint:**
   - Removed `useEffect` that auto-printed after 300ms
   - Truncate name via `truncateName()` (22 chars)
   - Improved layout: min-height 45mm, padding 6px, font sizes
   - RTL-friendly, compact sticker style

2. **Products page:**
   - Label modal title: "معاينة اللابل"
   - "طباعة لابل" button in edit form actions (opens label preview)

## E) Migration Notes

```bash
cd backend
python manage.py migrate inventory
```

If migration fails due to duplicate barcodes:
```sql
-- Find duplicates:
SELECT barcode, COUNT(*) FROM products WHERE barcode != '' GROUP BY barcode HAVING COUNT(*) > 1;
-- Fix manually before re-running migrate
```

## F) Manual Test Cases

1. **Barcode uniqueness:** Create product with manual barcode X; create another with same X → error "الباركود مستخدم مسبقاً"
2. **Label print:** Click "طباعة لابل" from list → modal opens with "معاينة اللابل" → no auto-print → click "طباعة" → only label prints
3. **Print from edit:** Edit product → click "طباعة لابل" in form → label modal opens → print works
4. **Long name:** Product name > 22 chars → label shows truncated with "..."
5. **Empty barcode:** Product with no barcode → label shows "لا يوجد باركود"

## G) Edge Cases Handled

- Duplicate barcode: DB constraint + serializer validation
- Empty barcode: Constraint excludes; multiple products can have ''
- Long product name: Truncated safely
- Print: Only label content visible (CSS hides rest)
