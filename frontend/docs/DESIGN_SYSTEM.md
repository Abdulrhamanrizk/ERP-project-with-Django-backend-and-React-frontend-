# نظام التصميم (Design System) - ERP

## 1️⃣ لوحة الألوان

### Primary
| Token | Hex | الاستخدام |
|-------|-----|----------|
| primary-50 | #EEF4FF | خلفية الأزرار الثانوية |
| primary-100 | #E0EAFF | Hover للعناصر الأساسية |
| primary-200 | #C7D7FE | حدود وحدود التركيز |
| primary-500 | #4F46E5 | العناصر التفاعلية |
| primary-600 | #4338CA | Primary الرئيسي |
| primary-700 | #3730A3 | Hover للأزرار |
| primary-800 | #312E81 | Active state |

### Secondary (Neutral)
| Token | Hex | الاستخدام |
|-------|-----|----------|
| gray-50 | #F8FAFC | خلفية الصفحة |
| gray-100 | #F1F5F9 | خلفية البطاقات الفرعية |
| gray-200 | #E2E8F0 | حدود خفيفة |
| gray-300 | #CBD5E1 | حدود |
| gray-400 | #94A3B8 | نص ثانوي |
| gray-500 | #64748B | Placeholder |
| gray-600 | #475569 | نص عادي |
| gray-700 | #334155 | نص أساسي |
| gray-800 | #1E293B | عناوين |
| gray-900 | #0F172A | عناوين رئيسية |

### Status Colors
| الحالة | Token | Hex |
|--------|-------|-----|
| Success | --success | #059669 |
| Warning | --warning | #D97706 |
| Danger | --danger | #DC2626 |
| Info | --info | #0EA5E9 |

### Background & Surface
| الاستخدام | Token |
|----------|-------|
| صفحة رئيسية | --bg-page: gray-50 |
| بطاقات | --surface: #FFFFFF |
| Sidebar | --surface-sidebar: gray-900 |
| Header | --surface-header: #FFFFFF |

---

## 2️⃣ Typography

| العنصر | الحجم | الوزن | Line Height |
|--------|-------|-------|-------------|
| H1 | 1.5rem (24px) | 700 | 1.3 |
| H2 | 1.25rem (20px) | 600 | 1.35 |
| H3 | 1.125rem (18px) | 600 | 1.4 |
| Body | 0.875rem (14px) | 400 | 1.5 |
| Small | 0.75rem (12px) | 400 | 1.4 |
| Label | 0.8125rem (13px) | 500 | 1.4 |

**الخطوط**: Cairo (عربي)، system-ui للنسخ الاحتياطي

---

## 3️⃣ Spacing System

| Token | القيمة | الاستخدام |
|-------|--------|----------|
| space-1 | 4px | تباعد ضيق |
| space-2 | 8px | تباعد صغير |
| space-3 | 12px | تباعد متوسط |
| space-4 | 16px | تباعد قياسي |
| space-5 | 20px | تباعد كبير |
| space-6 | 24px | تباعد أقسام |
| space-8 | 32px | تباعد أقسام كبيرة |

---

## 4️⃣ Shadows & Elevation

| المستوى | الاستخدام |
|---------|----------|
| shadow-sm | حدود البطاقات |
| shadow | البطاقات العادية |
| shadow-md | البطاقات المرتفعة، Dropdown |
| shadow-lg | Modal |
| shadow-xl | Toast، Tooltip |

---

## 5️⃣ Icon Style

- المكتبة: Lucide React
- الحجم: 18px (قائمة)، 20px (أزرار)، 24px (بطاقات)
- السمك: stroke-width: 2
- اللون: يورث من النص أو primary

---

## 6️⃣ Border Radius

| Token | القيمة |
|-------|--------|
| radius-sm | 4px |
| radius | 8px |
| radius-lg | 12px |
| radius-xl | 16px |
| radius-full | 9999px |

---

## 7️⃣ قائمة المكونات (Components)

- **Layout**: Sidebar, Topbar, PageContainer
- **Data**: Table, DataTable, EmptyState, LoadingState
- **Forms**: Input, Select, Textarea, Checkbox, FormGroup, FormRow
- **Feedback**: Button, Badge, Alert, Toast
- **Overlay**: Modal, Drawer, Dropdown
- **Navigation**: NavItem, Tabs, Breadcrumb
- **Cards**: Card, KPICard, ModuleCard
