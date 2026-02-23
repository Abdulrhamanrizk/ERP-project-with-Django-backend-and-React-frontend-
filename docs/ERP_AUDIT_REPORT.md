# ERP Codebase Audit Report

## Phase 1 — Audit Summary

### 1) Backend — Key Files

| Module | Models | Serializers | Views | Services |
|--------|--------|-------------|-------|----------|
| **sales** | `Sale`, `SaleItem` | `SaleSerializer`, `SaleWriteSerializer` | `SaleViewSet` + `confirm` | None |
| **treasury** | `Payment`, `CashAccount`, `Transfer`, `Advance` | Full CRUD serializers | ViewSets + `post_entry` | None |
| **accounting** | `JournalEntry`, `JournalLine`, `Account`, `AccountType` | Full serializers | ViewSets | `services.py` (create_*_journal_entry) |
| **inventory** | `Product`, `StockMovement`, `ProductCost`, `ProductSerial` | Full serializers | ViewSets | None |
| **core** | `Party`, `Branch`, `Organization`, `User` | Full serializers | ViewSets | None |

---

### 2) Frontend — Key Files

| Page | Path | Main Features |
|------|------|---------------|
| **Sales** | `pages/Sales.tsx` | List, Add modal, Confirm button, line items |
| **Treasury** | `pages/Treasury.tsx` | Tabs: receipts, payments, accounts, transfers; post_entry |
| **Journal** | `pages/JournalEntries.tsx` | Read-only list; link to admin for create |
| **Parties** | `pages/Parties.tsx` | CRUD customers/suppliers |

---

### 3) Gaps Analysis by Module

#### SALES MODULE

| Aspect | What Exists | What's Missing |
|--------|-------------|----------------|
| **Document types** | Invoice only (Sale) | Quotation, Sales Order |
| **Status** | draft, confirmed, cancelled | posted flag, partial-paid |
| **Payment** | None on invoice | payment_type (cash/credit), link payments to invoice, paid_amount, due |
| **Returns** | None | Full/partial return, stock reversal, return accounting |
| **Pricing** | unit_price, discount (line), discount (invoice) | Tax, profit/cost per line, margin % |
| **Stock** | None | No deduction on confirm, no reserve, no validation |
| **Accounting** | A/R + Revenue only | COGS, cash-sale path (direct to Cash), customer sub-ledger |
| **Business rules** | Confirm creates journal | No stock check, no discount limits, no edit-after-post guard |
| **Technical** | Serializer create | No `update()`, no `transaction.atomic`, no idempotency guard in confirm |

#### TREASURY MODULE

| Aspect | What Exists | What's Missing |
|--------|-------------|----------------|
| **Payment** | Receipt/payment, party, sale, purchase FKs | Journal uses **suspense** not A/R or A/P when linked to invoice |
| **Accounting** | Cash↔Suspense | Should be Cash↔A/R when receipt for sale; Cash↔A/P when payment for purchase |
| **Accounts** | Multiple cash/bank, balance calc | Transfers OK; no approval, no limit checks |
| **Linkage** | Can select sale/purchase in form | Backend does not use it for correct GL posting |

#### ACCOUNTING MODULE

| Aspect | What Exists | What's Missing |
|--------|-------------|----------------|
| **Journal** | Manual + auto entries, debit/credit | No debit=credit validation on create, no period lock |
| **Posting** | is_posted flag | No reversal flow, no edit-after-post guard |
| **Sub-ledgers** | Single 1140 (A/R), 2140 (A/P) | No per-customer/per-supplier accounts; aging impossible |
| **Transactions** | None | No `transaction.atomic` in services |
| **Reference** | SALE-{id}, PURCH-{id} | Good; payment has no reference to invoice |

#### INVENTORY MODULE

| Aspect | What Exists | What's Missing |
|--------|-------------|----------------|
| **Stock** | StockMovement, ProductCost | No link to sales; no deduction on sale confirm |
| **Cost** | ProductCost (purchase_price, actual_cost) | No FIFO; weighted avg implied only |
| **Serials** | ProductSerial model | Not used in sales flow |
| **Validation** | None | No stock check before sale |

#### CUSTOMERS / SUPPLIERS (Party)

| Aspect | What Exists | What's Missing |
|--------|-------------|----------------|
| **Model** | Party (customer/supplier) | No account_id (GL link) |
| **Frontend** | Basic CRUD | No statement, no aging, no balance |

---

### 4) Critical Accounting Flaw

**Payment journal posting is incorrect when linked to sale/purchase:**

- Current: `Cash ← debit | Suspense ← credit` (receipt) or `Suspense ← debit | Cash ← credit` (payment)
- Correct for customer receipt: `Cash ← debit | A/R (or customer sub-ledger) ← credit`
- Correct for supplier payment: `A/P ← debit | Cash ← credit`

The `payment.sale` and `payment.purchase` FKs exist but are **not used** in `create_payment_journal_entry`.

---

### 5) Implementation Priority

1. **P1 — Fix payment accounting** when linked to sale/purchase (use A/R, A/P)
2. **P2 — Sales: stock deduction** on confirm + basic stock validation
3. **P3 — Sales: payment_type** (cash/credit) + cash-sale accounting path
4. **P4 — Add `transaction.atomic`** to all posting operations
5. **P5 — Sales: returns** (partial/full) + reversal
6. **P6 — Journal: debit=credit validation** + period lock
7. **P7 — Party ledger** (balance, statement, aging)

---

### 6) Files to Modify (Phase 2+)

| Change | Backend | Frontend |
|--------|---------|----------|
| Payment accounting fix | `accounting/services.py` | — |
| Stock deduction on sale | `sales/` (service or signal) | — |
| transaction.atomic | `accounting/services.py`, `sales/views.py` | — |
| payment_type on Sale | `sales/models.py`, serializers | `Sales.tsx` |
| Cash sale accounting | `accounting/services.py` | — |
| Sale update validation | `sales/serializers.py`, views | — |
| Payment-sale link in UI | — | `Treasury.tsx` (already can select sale) |

---

*Report generated for ERP enhancement. Next: implement Phase 2 improvements.*
