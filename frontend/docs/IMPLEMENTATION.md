# دليل التنفيذ والتوسع

## هيكل الملفات

```
frontend/
├── src/
│   ├── theme/
│   │   └── tokens.css          # Design tokens (ألوان، تباعد، ظلال)
│   ├── styles/
│   │   ├── layout.css          # Sidebar, Topbar, Content
│   │   ├── dashboard.css       # لوحة التحكم
│   │   ├── index.css           # مكونات عامة (جداول، نماذج، أزرار)
│   │   └── login.css           # صفحة تسجيل الدخول
│   ├── components/
│   │   ├── icons/              # أيقونات SVG
│   │   ├── ui/                 # مكونات قابلة لإعادة الاستخدام
│   │   │   ├── EmptyState.tsx
│   │   │   └── LoadingState.tsx
│   │   └── Modal.tsx
│   └── layouts/
│       └── Layout.tsx          # التخطيط الرئيسي
└── docs/
    ├── UX_ANALYSIS.md
    ├── DESIGN_SYSTEM.md
    └── IMPLEMENTATION.md
```

## المكونات القابلة لإعادة الاستخدام

| المكون | الاستخدام |
|--------|----------|
| EmptyState | عرض حالة فارغة مع أيقونة وعنوان وإجراء |
| LoadingState | عرض حالة تحميل مع سبينر ونص |
| Modal | نافذة منبثقة مع عنوان وزر إغلاق |

## الاقتراحات لمكتبات UI

- **react-hot-toast** أو **sonner**: للتنبيهات (Toast)
- **@tanstack/react-table**: للجداول المتقدمة (Sorting, Filtering, Pagination)
- **react-hook-form** + **zod**: للنماذج مع Validation
- **framer-motion**: للرسوم المتحركة المتقدمة

## Best Practices

1. **استخدم Design Tokens**: لا تكتب ألوان أو مسافات مباشرة، استخدم `var(--primary-600)` مثلاً.
2. **RTL**: جميع العناصر مصممة لـ RTL، تجنب `margin-left` بدون مقابل `margin-right`.
3. **الوصولية**: استخدم `aria-label` للأزرار التي تحتوي على أيقونات فقط.
4. **التحميل**: اعرض LoadingState أثناء جلب البيانات.
5. **الفارغ**: اعرض EmptyState عندما لا توجد بيانات.
