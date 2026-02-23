# STEP 1 — Audit: Current Implementation of Phase 4–6 Features

## 1. SKU Auto-Generation

### What exists
- `get_next_sku_simple(organization_id)` in `inventory/services.py`
- Format: `PRD-000001` (6-digit numeric suffix)
- `ensure_product_sku_barcode(product)` called after product create/update in ProductWriteSerializer
- Only generates when SKU is empty or whitespace
- Product model: `unique_together = [['organization', 'sku']]` — DB-level uniqueness per org

### What works well
- Format is consistent and readable
- DB constraint prevents duplicate SKU per organization
- Serializer validates duplicate SKU before create/update
- Called inside `transaction.atomic()` with product create

### What is missing / weak / risky
- **Race condition:** Two concurrent requests could get same max_num and both generate `PRD-000001`. No `select_for_update()` or retry logic.
- **SKU scope:** `get_next_sku_simple` only considers products with `sku__istartswith='PRD-'`; manual SKUs (e.g. `ABC-001`) are ignored when computing next number. Risk: if all products use custom SKUs, next auto-SKU could clash with existing manual.
- **Limit 1000:** `products.values_list('sku', flat=True)[:1000]` — if org has >1000 PRD- products, max might be wrong.

### What should be improved (minimal safe changes)
- Add retry on IntegrityError for SKU collision (or use `select_for_update` when generating)
- Consider DB unique index on barcode (currently only serializer validation)

---

## 2. Barcode Auto-Generation

### What exists
- `get_next_barcode()` in `inventory/services.py`
- Format: 13 digits, prefix `2000000` + 6-digit sequence (e.g. `2000000000001`)
- `ensure_product_sku_barcode(product)` fills barcode if empty
- Serializer: `validate_barcode()` checks uniqueness before save
- **No DB unique constraint** on barcode

### What works well
- Prefix avoids collision with real EAN barcodes
- Serializer validation prevents duplicates at API level
- Called inside transaction with product create

### What is missing / weak / risky
- **No DB uniqueness:** Barcode uniqueness only at serializer level. Direct DB inserts or race conditions could create duplicates.
- **Race condition:** Same as SKU — concurrent requests could generate same barcode.
- **Global scope:** Barcode is globally unique (not per-org), which is correct for barcodes.

### What should be improved (minimal safe changes)
- Add DB unique constraint on `Product.barcode` when not empty (with migration)
- Add retry/IntegrityError handling for barcode collision
- Consider explicit `opening_balance` movement type for opening stock (see below)

---

## 3. Product Label Printing

### What exists
- `ProductLabelPrint` component in `frontend/src/components/ProductLabelPrint.tsx`
- Uses `react-barcode` (CODE128)
- Trigger: "طباعة لابل" row action in Products table → opens modal with label
- Label content: product name (truncated >25 chars), barcode visual + number, selling price, SKU
- Print: `window.print()` via button; **also auto-print after 300ms on mount**
- Styles: 60mm width, RTL, compact

### What works well
- Name truncation (25 chars → 22 + "...")
- Barcode visual + human-readable number
- Arabic RTL layout
- Print media CSS hides other page content
- Handles empty barcode: shows "لا يوجد باركود"

### What is missing / weak / risky
- **Auto-print on open:** `useEffect` in ProductLabelPrint calls `window.print()` after 300ms when modal opens. User may want preview only; auto-print can be unexpected.
- **Print from edit:** No "Print label" shortcut inside product edit modal
- **Preview clarity:** Modal shows one label; layout is OK but could be clearer as "معاينة اللابل"
- **Selling price source:** Uses `obj.costs.first()` — may not match current branch; no branch-aware price

### What should be improved (minimal safe changes)
- Remove or make optional the auto-print on mount; keep manual "طباعة" button as primary action
- Add optional "طباعة لابل" button in product edit modal (quick action)
- Add "معاينة اللابل" as modal title when showing preview

---

## 4. Opening Stock in Product Create Flow

### What exists
- Checkbox "إضافة رصيد افتتاحي الآن" in product create form (create only)
- Fields: الفرع, الكمية, تكلفة الوحدة, مرجع الحركة
- Payload: `opening_stock_enabled`, `opening_branch_id`, `opening_quantity`, `opening_unit_cost`, `opening_note`
- Backend: ProductWriteSerializer creates `StockMovement` with `movement_type='in'`, `reference/notes` = note
- `transaction.atomic()` wraps product + movement + ProductCost
- Validation: branch required, quantity > 0
- Branch validation: user access, branch.organization_id == product.organization_id

### What works well
- Atomic transaction
- Branch access and org validation
- Unit cost fallback: `opening_unit_cost` used for ProductCost when provided
- Clear Arabic labels: الفرع, الكمية, تكلفة الوحدة, مرجع الحركة

### What is missing / weak / risky
- **No BranchContext default:** Products page does NOT use `useBranch()`; opening_branch_id is never defaulted from `currentBranchId`. User must always select branch.
- **Single branch:** If user has one branch, we could auto-select it.
- **No Warehouse model:** Spec mentions "المخزن" — system has no Warehouse; Branch IS the location. No warehouse dropdown exists. OK per current design.
- **Movement type:** Uses `'in'` not `'opening_balance'` or `'initial_stock'`. Harder to distinguish opening stock from regular stock-in for reporting.
- **Unit cost fallback:** When `opening_unit_cost` is null, purchase_price from form is used for ProductCost. Logic is correct.
- **Negative/zero:** Serializer has `min_value=Decimal('0.01')` for quantity; validation in `validate()` also checks `qty <= 0`. Good.

### What should be improved (minimal safe changes)
- Add `opening_balance` (or `initial_stock`) to StockMovement.MOVEMENT_TYPES; use it for opening stock
- Default `opening_branch_id` from BranchContext when user has one branch
- Add branch validation: Branch.objects.filter(pk=bid).exists() and belongs to org (already done)

---

## 5. Serial Tracking Flow After Opening Stock

### What exists
- Product.track_serial flag
- ProductSerial model: product, branch, serial_number, status (in_stock, sold, reserved, defective)
- ProductSerial unique_together: (product, serial_number)
- ProductSerialViewSet: CRUD for serials
- Warehouse page: manual stock movements (in/out etc.) — no serial entry UI in product create flow

### What works well
- ProductSerial enforces unique serial per product
- Serials linked to product + branch
- Status allows tracking (in_stock, sold, etc.)

### What is missing / weak / risky
- **No serial entry during product create:** When user creates product with `track_serial=true` and `opening_stock_enabled=true`, the system creates StockMovement but **does NOT create any ProductSerial records**. User is not prompted to enter serials.
- **No validation:** Stock quantity can exist without matching serials for serial-tracked products. Data inconsistency.
- **No serial modal:** No "إدخال الأرقام المسلسلة" modal after product creation.
- **No count check:** No validation that serial count == opening quantity.

### What should be improved (minimal safe changes)
- Add post-create serial entry flow: when track_serial + opening_stock, auto-open serial entry modal after product created
- Modal: multi-line input (one serial per line), expected count vs entered count, duplicate detection
- Backend: optional endpoint or extend create response to support serial bulk create; validate count match
- Document: if architecture cannot enforce "serials required" strictly, add a flag (e.g. `opening_serials_pending`) and show warning in UI

---

## 6. Product List Columns / Search / Actions

### What exists
- Columns: الرمز (SKU), اسم المنتج, الفئة, سعر البيع, الباركود, رقم مسلسل؟, متاح؟, إجراءات
- Search: `search` param → ProductViewSet `search_fields = ['name', 'sku', 'barcode']`
- Actions: طباعة لابل, أسعار وتكاليف ($), تعديل, حذف
- Empty state: EmptyState with "لا توجد منتجات"
- Loading: "جاري التحميل..."

### What works well
- All required columns present
- Search works by name, SKU, barcode (DRF SearchFilter)
- Actions match spec (تعديل, طباعة لابل)
- Arabic labels

### What is missing / weak / risky
- **Search URL bug:** `load()` uses `api.get(\`/inventory/products/${params.toString() ? '?' + params : ''}\`)` — when search is empty, URL is `/inventory/products/` (correct). When search exists, it becomes `/inventory/products/?search=x` — but the path is wrong: it should be `/inventory/products/?search=x` not `/inventory/products/?search=x` as a path. Actually the template is: `/inventory/products/` + (params ? `?` + params : '') = `/inventory/products/?search=x`. Correct.
- **No الرصيد الحالي column:** Spec says optional; not implemented.
- **Status display:** "نعم/لا" for serial and active — could use badges/chips for clarity
- **No-results for search:** When search returns 0 items, same empty state as "no products at all" — could add "لا توجد نتائج لـ \"...\"" message
- **Loading state:** Simple text; could use skeleton or spinner for better UX

### What should be improved (minimal safe changes)
- Add optional current stock column (if API supports it — would need aggregation or separate endpoint)
- Improve empty state: when searchQuery has value, show "لا توجد نتائج للبحث"
- Add status badges (e.g. chip for "رقم مسلسل" / "متاح")
- Polish loading state (optional)

---

## Summary: Priority Improvements

| Priority | Item | Effort |
|----------|------|--------|
| High | Barcode DB unique constraint | Low (migration) |
| High | Add opening_balance movement type | Low |
| High | Default opening branch from BranchContext | Low |
| High | Serial entry modal after product+opening create | Medium |
| Medium | Remove/make optional auto-print in ProductLabelPrint | Low |
| Medium | Retry on SKU/barcode IntegrityError | Low |
| Medium | Search empty state message | Low |
| Low | Print from edit shortcut | Low |
| Low | Status badges in product list | Low |
