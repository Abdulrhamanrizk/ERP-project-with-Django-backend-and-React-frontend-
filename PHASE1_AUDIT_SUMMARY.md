# PHASE 1 — Audit Summary: Product / Category / Stock

## A) Current Structure Summary

### Product Model (`backend/apps/inventory/models/product.py`)

| Field | Type | Notes |
|-------|------|-------|
| organization | FK → Organization | CASCADE |
| category | FK → Category | SET_NULL, optional |
| sku | CharField(50) | blank, unique per org |
| name | CharField(255) | Arabic |
| name_en | CharField(255) | blank |
| description | TextField | blank |
| barcode | CharField(100) | blank |
| unit | CharField(20) | default 'قطعة' |
| track_serial | BooleanField | default False |
| min_stock | DecimalField(12,2) | default 0 |
| is_active | BooleanField | default True |
| created_at, updated_at | BaseModel | inherited |

**Pricing:** In `ProductCost` (product + branch) — purchase_price, selling_price, extra_expenses, actual_cost.

### Category Model (`backend/apps/inventory/models/category.py`)

| Field | Type | Notes |
|-------|------|-------|
| organization | FK → Organization | CASCADE |
| parent | FK → self | nullable, tree support |
| name | CharField(255) | Arabic |
| name_en | CharField(255) | blank |
| code | CharField(50) | blank, unique per org when not empty |
| description | TextField | blank |
| is_active | BooleanField | default True |
| created_at, updated_at | BaseModel | inherited |

### StockMovement Model (`backend/apps/inventory/models/stock_movement.py`)

| Field | Type | Notes |
|-------|------|-------|
| branch | FK → Branch | CASCADE |
| product | FK → Product | PROTECT |
| movement_type | CharField(20) | in, out, transfer, adjust, return_in, return_out |
| quantity | DecimalField(12,2) | positive |
| reference | CharField(100) | blank |
| notes | TextField | blank |
| created_by | FK → User | SET_NULL |
| created_at, updated_at | BaseModel | inherited |

### Warehouse / Location

**No Warehouse model.** Stock is tracked per **Branch** (branch = inventory location). Phase 5 "Warehouse" maps to Branch.

### Branch & Organization

- **Product** → organization (multi-tenant)
- **ProductCost** → product + branch (prices per branch)
- **StockMovement** → product + branch
- **Branch** → organization

---

## B) What Already Exists

| Feature | Status | Location |
|---------|--------|----------|
| Selling price | ✅ | ProductCost |
| Purchase price | ✅ | ProductCost |
| SKU | ✅ | Product, auto-gen if empty |
| Barcode | ✅ | Product, auto-gen if empty |
| Serial tracking | ✅ | Product.track_serial, ProductSerial |
| Active field | ✅ | Product.is_active |
| Category hierarchy | ✅ | Category.parent in model |
| Opening stock on create | ✅ | StockMovement type 'in' |
| Product label print | ✅ | ProductLabelPrint, react-barcode |
| Search by name/SKU/barcode | ✅ | ProductViewSet search_fields |
| BranchContext | ✅ | Layout topbar |

**Stock calculation:** From `StockMovement` (no cached field). `get_stock()` in `sales/services.py` sums in/return_in vs out/return_out/transfer.

---

## C) What Is Missing for Target Flow

| Item | Gap | Phase |
|------|-----|-------|
| Category defaults | No costing_method | 2 |
| Category form | Parent, costing_method not in UI | 2 |
| Product costing | No costing_method, no inheritance from category | 2 |
| Product form | Warranty months, default supplier | 3 |
| Product form UX | Field order, Arabic labels, org auto-hide | 3 |
| StockMovement type | Uses 'in' for opening (no explicit opening_balance) | 5 |

---

## D) Implementation Plan (Phased)

1. **Phase 2** — Category: add costing_method, parent in form; Product: costing_method + inherit from category.
2. **Phase 3** — Product form: reorder fields, warranty_months, default_supplier, org auto-hide.
3. **Phase 4** — SKU/Barcode auto-gen already exists; ensure uniqueness and clear errors.
4. **Phase 5** — Opening stock: already works with Branch; add opening_warehouse_id → use branch (no Warehouse model).
5. **Phase 6** — Serial entry flow when opening stock + serial-tracked.
6. **Phase 7** — Label printing already exists; verify barcode + price.
7. **Phase 8** — Products list: add SKU column, ensure search works.
8. **Phase 9** — Arabic labels review.
