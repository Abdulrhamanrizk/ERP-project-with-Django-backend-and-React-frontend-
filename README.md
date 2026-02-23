# نظام ERP لمتجر كمبيوتر

نظام إدارة موارد مؤسسية متكامل لإدارة متاجر الكمبيوتر متعددة الفروع.

## المتطلبات

- Python 3.11+
- Node.js 18+
- PostgreSQL (أو SQLite للتطوير)
- Redis (اختياري للتخزين المؤقت)

## التشغيل

### 1. إعداد Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements/base.txt
python manage.py migrate
python manage.py init_account_types
python manage.py createsuperuser   # إنشاء مستخدم للمرة الأولى
python manage.py runserver
```

**تشغيل سريع (Windows):** انقر مرتين على `backend\run.bat` — يشغّل السيرفر على **المنفذ 8001** لتفادي التعارض مع مشاريع Django الأخرى.

**ملاحظة:** المشروع يعتمد ملف `.env` داخل مجلد `backend/` فقط، ولديه قاعدة بيانات مستقلة (`erp_db.sqlite3`) فلا يختلط بمشاريع Django الأخرى.

### 2. إعداد Frontend

```bash
cd frontend
npm install
npm run dev
```

ملاحظة: الـ Frontend يستخدم Vite proxy لإعادة توجيه `/api` إلى الـ Backend. شغّل الـ Backend على المنفذ 8000.

### 3. الوصول

- Frontend: http://localhost:5173
- API: http://localhost:8000
- Admin: http://localhost:8000/admin

## هيكل المشروع

```
erp/
├── backend/          # Django + DRF
│   ├── config/       # إعدادات المشروع
│   └── apps/
│       ├── core/     # المنظمات، الفروع، المستخدمون
│       ├── accounting/   # الحسابات والقيود
│       ├── treasury/     # الخزينة
│       ├── inventory/    # المخزون
│       ├── sales/        # المبيعات
│       ├── purchases/    # المشتريات
│       ├── maintenance/  # الصيانة
│       └── reporting/    # التقارير
├── frontend/         # React + Vite + TypeScript
└── README.md
```

## قاعدة البيانات

بدون `DATABASE_URL` يستخدم النظام SQLite. لاستخدام PostgreSQL:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/erp_db
```
