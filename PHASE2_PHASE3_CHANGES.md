# Phase 2 & Phase 3 — Implementation Summary

## PHASE 2 — Category Upgrade (Odoo-like)

### Backend Changes

| File | Change |
|------|--------|
| `backend/apps/inventory/models/category.py` | Added `costing_method` (FIFO/AVERAGE, default AVERAGE) |
| `backend/apps/inventory/serializers.py` | Added `costing_method` to CategorySerializer |
| `backend/apps/inventory/migrations/0003_*.py` | Migration for category.costing_method |

### Frontend Changes

| File | Change |
|------|--------|
| `frontend/src/pages/Categories.tsx` | Added "الفئة الأب" (Parent Category) dropdown |
| `frontend/src/pages/Categories.tsx` | Added "طريقة التكلفة" (Costing Method) dropdown |
| `frontend/src/pages/Categories.tsx` | Table columns: الفئة الأب, طريقة التكلفة |

### Product Inheritance from Category

| File | Change |
|------|--------|
| `backend/apps/inventory/models/product.py` | Added `costing_method` (nullable) |
| `backend/apps/inventory/serializers.py` | ProductWriteSerializer.create() inherits costing_method from category when product's is empty |

---

## PHASE 3 — Simplify Product Form

### Backend Changes

| File | Change |
|------|--------|
| `backend/apps/inventory/models/product.py` | Added `warranty_months`, `default_supplier` (FK to Party) |
| `backend/apps/inventory/serializers.py` | ProductWriteSerializer: warranty_months, default_supplier, validation (supplier same org, is_supplier) |
| `backend/apps/inventory/serializers.py` | ProductSerializer: added warranty_months, default_supplier, costing_method to fields |
| `backend/apps/inventory/migrations/0003_*.py` | Migration for product.warranty_months, product.default_supplier |

### Frontend Changes

| File | Change |
|------|--------|
| `frontend/src/pages/Products.tsx` | Reordered form: Category, Name, Unit, Selling Price, Purchase Price, Serial checkbox, Active checkbox |
| `frontend/src/pages/Products.tsx` | Moved SKU, Barcode to "إعدادات إضافية" (Advanced) |
| `frontend/src/pages/Products.tsx` | Added حد إعادة الطلب, مدة الضمان بالشهور (when serial-tracked), المورد الافتراضي in advanced |
| `frontend/src/pages/Products.tsx` | Load suppliers when organization selected (`/core/parties/?organization=X&is_supplier=true`) |
| `frontend/src/pages/Products.tsx` | Payload includes warranty_months, default_supplier |
| `frontend/src/pages/Products.tsx` | OpenEdit loads warranty_months, default_supplier |

---

## Migration

Run before testing:

```bash
cd backend
# Activate venv if needed, then:
python manage.py migrate inventory
```

---

## Manual Test Cases

### Phase 2 — Category
1. Add category with Parent = "without", Costing Method = "المتوسط المرجح"
2. Add child category with Parent = first category, Costing Method = "أول وارد أول صادر"
3. Edit category, change costing method
4. Table shows الفئة الأب and طريقة التكلفة

### Phase 2 — Product Inheritance
1. Create product with Category that has costing_method = FIFO, leave product costing_method empty
2. Verify product gets FIFO from category (check API response or admin)

### Phase 3 — Product Form
1. Add product: Category, Name, Unit, Selling Price, Purchase Price
2. Check "المنتج له رقم مسلسل" → مدة الضمان appears in Advanced
3. Expand "إعدادات إضافية" → SKU, Barcode, حد إعادة الطلب, المورد الافتراضي
4. Select default supplier (must be supplier in same org)
5. Edit product → verify warranty_months and default_supplier load
6. Single org: Organization field hidden

---

## Edge Cases Handled

- Category parent: cannot select self (excluded when editing)
- default_supplier: validated same organization, must be is_supplier
- costing_method inheritance: only when product's is empty and category has value
- warranty_months: shown only when track_serial = true
