"""خدمة إنشاء القيود التلقائية"""
from decimal import Decimal
from django.db import transaction
from django.db.models import Max

from .models import Account, AccountType, JournalEntry, JournalLine


def _get_or_create_account(organization, code, name, acc_type_code):
    """الحصول على أو إنشاء حساب"""
    acc_type = AccountType.objects.filter(code=acc_type_code).first()
    if not acc_type:
        return None
    acc, _ = Account.objects.get_or_create(
        organization=organization,
        code=code,
        defaults={'name': name, 'account_type': acc_type, 'is_system': True}
    )
    return acc


def _get_or_create_suspense_account(organization):
    """حساب مؤقت للطرف المقابل"""
    return _get_or_create_account(organization, '4999', 'إيرادات مؤقتة', 'REV')


def _get_next_entry_number():
    last = JournalEntry.objects.aggregate(Max('id'))['id__max'] or 0
    return f"J-{last + 1:05d}"


def create_payment_journal_entry(payment, user=None):
    """إنشاء قيد تلقائي لسند قبض أو صرف.
    إذا مرتبط بفاتورة مبيعات: مدين نقدية / دائن ذمم عملاء (A/R).
    إذا مرتبط بفاتورة مشتريات: مدين ذمم موردين (A/P) / دائن نقدية.
    وإلا: استخدام الحساب المؤقت (Suspense).
    """
    if payment.is_posted:
        return
    ref = f"PAYMENT-{payment.id}"
    if JournalEntry.objects.filter(reference=ref, journal_type='auto').exists():
        return

    cash_acc = payment.cash_account
    gl_account = cash_acc.account
    org = payment.branch.organization
    amount = payment.amount

    with transaction.atomic():
        receivables = _get_or_create_account(org, '1140', 'مدينون', 'ASSET')
        payables = _get_or_create_account(org, '2140', 'دائنون', 'LIAB')
        suspense = _get_or_create_suspense_account(org)
        if not gl_account:
            return

        # سند قبض مرتبط بفاتورة مبيعات → مدين نقدية / دائن ذمم عملاء
        if payment.payment_type == 'receipt' and payment.sale_id and receivables:
            debit_acc, credit_acc = gl_account, receivables
            desc = f'قبض من عميل - {payment.sale.sale_number}'
        # سند صرف مرتبط بفاتورة مشتريات → مدين ذمم موردين / دائن نقدية
        elif payment.payment_type == 'payment' and payment.purchase_id and payables:
            debit_acc, credit_acc = payables, gl_account
            desc = f'دفع لمورد - {payment.purchase.purchase_number}'
        # إيراد/مصروف عام → استخدام الحساب المؤقت
        elif suspense:
            if payment.payment_type == 'receipt':
                debit_acc, credit_acc = gl_account, suspense
                desc = f'مقبوض - {payment.reference or ""}'
            else:
                debit_acc, credit_acc = suspense, gl_account
                desc = f'مدفوع - {payment.reference or ""}'
        else:
            return

        entry = JournalEntry.objects.create(
            branch=payment.branch,
            entry_number=_get_next_entry_number(),
            entry_date=payment.payment_date,
            journal_type='auto',
            description=desc,
            reference=ref,
            is_posted=True,
            created_by=user,
        )
        JournalLine.objects.create(journal_entry=entry, account=debit_acc, debit=amount, credit=Decimal('0'), description=desc[:100], line_order=0)
        JournalLine.objects.create(journal_entry=entry, account=credit_acc, debit=Decimal('0'), credit=amount, description=desc[:100], line_order=1)
        entry._recalculate_totals()
        payment.is_posted = True
        payment.save(update_fields=['is_posted'])
        return entry


def create_transfer_journal_entry(transfer, user=None):
    """إنشاء قيد تلقائي للتحويل بين الحسابات"""
    if transfer.is_posted:
        return
    from_gl = transfer.from_account.account
    to_gl = transfer.to_account.account
    if not from_gl or not to_gl:
        return

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            branch=transfer.branch,
            entry_number=_get_next_entry_number(),
            entry_date=transfer.transfer_date,
            journal_type='auto',
            description=f"تحويل - {transfer.reference or ''}",
            reference=transfer.reference,
            is_posted=True,
            created_by=user,
        )
        JournalLine.objects.create(journal_entry=entry, account=to_gl, debit=transfer.amount, credit=Decimal('0'), description='تحويل وارد', line_order=0)
        JournalLine.objects.create(journal_entry=entry, account=from_gl, debit=Decimal('0'), credit=transfer.amount, description='تحويل صادر', line_order=1)
        entry._recalculate_totals()
        transfer.is_posted = True
        transfer.save(update_fields=['is_posted'])
        return entry


def create_sale_journal_entry(sale, user=None):
    """إنشاء قيد تلقائي عند تأكيد فاتورة مبيعات.
    بيع نقدي (payment_type=cash وcash_account محدد): مدين نقدية / دائن إيرادات.
    بيع آجل: مدين ذمم عملاء / دائن إيرادات.
    """
    if sale.status != 'confirmed':
        return
    org = sale.branch.organization
    revenue = _get_or_create_account(org, '4110', 'مبيعات', 'REV')
    if not revenue:
        return

    existing = JournalEntry.objects.filter(reference=f"SALE-{sale.id}", journal_type='auto').exists()
    if existing:
        return

    # بيع نقدي: استخدام حساب الخزينة المرتبط
    if sale.payment_type == 'cash' and sale.cash_account_id and sale.cash_account.account_id:
        debit_account = sale.cash_account.account
        debit_desc = 'مقبوض - فاتورة مبيعات'
    else:
        receivables = _get_or_create_account(org, '1140', 'مدينون', 'ASSET')
        if not receivables:
            return
        debit_account = receivables
        debit_desc = 'ذمم عملاء'

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            branch=sale.branch,
            entry_number=_get_next_entry_number(),
            entry_date=sale.sale_date,
            journal_type='auto',
            description=f"فاتورة مبيعات {sale.sale_number}",
            reference=f"SALE-{sale.id}",
            is_posted=True,
            created_by=user,
        )
        JournalLine.objects.create(journal_entry=entry, account=debit_account, debit=sale.total, credit=Decimal('0'), description=debit_desc, line_order=0)
        JournalLine.objects.create(journal_entry=entry, account=revenue, debit=Decimal('0'), credit=sale.total, description='مبيعات', line_order=1)
        entry._recalculate_totals()
        return entry


def create_sale_return_reversal_journal_entry(sale_return, user=None):
    """إنشاء قيد معاكس لمرتجع المبيعات.
    عكس قيد البيع: مدين إيرادات (تقليل) / دائن نقدية أو ذمم عملاء.
    """
    if sale_return.status != 'confirmed':
        return
    sale = sale_return.sale
    org = sale.branch.organization
    revenue = _get_or_create_account(org, '4110', 'مبيعات', 'REV')
    if not revenue:
        return

    existing = JournalEntry.objects.filter(
        reference=f"RETURN-{sale_return.id}", journal_type='auto'
    ).exists()
    if existing:
        return

    amount = sale_return.total
    # بيع نقدي أصلي: عكس → دائن نقدية
    if sale.payment_type == 'cash' and sale.cash_account_id and sale.cash_account.account_id:
        credit_account = sale.cash_account.account
        credit_desc = 'مرتجع مبيعات - إرجاع نقدي'
    else:
        receivables = _get_or_create_account(org, '1140', 'مدينون', 'ASSET')
        if not receivables:
            return
        credit_account = receivables
        credit_desc = 'مرتجع - تقليل ذمم عملاء'

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            branch=sale.branch,
            entry_number=_get_next_entry_number(),
            entry_date=sale_return.return_date,
            journal_type='auto',
            description=f"مرتجع مبيعات {sale_return.return_number} - {sale.sale_number}",
            reference=f"RETURN-{sale_return.id}",
            is_posted=True,
            created_by=user,
        )
        JournalLine.objects.create(
            journal_entry=entry, account=revenue,
            debit=amount, credit=Decimal('0'),
            description='مرتجع مبيعات', line_order=0
        )
        JournalLine.objects.create(
            journal_entry=entry, account=credit_account,
            debit=Decimal('0'), credit=amount,
            description=credit_desc, line_order=1
        )
        entry._recalculate_totals()
        return entry


def create_purchase_return_reversal_journal_entry(purchase_return, user=None):
    """إنشاء قيد معاكس لمرتجع المشتريات.
    عكس قيد الشراء: مدين ذمم موردين / دائن مشتريات.
    """
    if purchase_return.status != 'confirmed':
        return
    purchase = purchase_return.purchase
    org = purchase.branch.organization
    expense = _get_or_create_account(org, '5110', 'مشتريات', 'EXP')
    payables = _get_or_create_account(org, '2140', 'دائنون', 'LIAB')
    if not expense or not payables:
        return

    existing = JournalEntry.objects.filter(
        reference=f"PRETURN-{purchase_return.id}", journal_type='auto'
    ).exists()
    if existing:
        return

    amount = purchase_return.total

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            branch=purchase.branch,
            entry_number=_get_next_entry_number(),
            entry_date=purchase_return.return_date,
            journal_type='auto',
            description=f"مرتجع مشتريات {purchase_return.return_number} - {purchase.purchase_number}",
            reference=f"PRETURN-{purchase_return.id}",
            is_posted=True,
            created_by=user,
        )
        JournalLine.objects.create(
            journal_entry=entry, account=payables,
            debit=amount, credit=Decimal('0'),
            description='مرتجع - تقليل ذمم موردين', line_order=0
        )
        JournalLine.objects.create(
            journal_entry=entry, account=expense,
            debit=Decimal('0'), credit=amount,
            description='مرتجع مشتريات', line_order=1
        )
        entry._recalculate_totals()
        return entry


def create_purchase_journal_entry(purchase, user=None):
    """إنشاء قيد تلقائي عند تأكيد فاتورة مشتريات"""
    if purchase.status != 'confirmed':
        return
    org = purchase.branch.organization
    expense = _get_or_create_account(org, '5110', 'مشتريات', 'EXP')
    payables = _get_or_create_account(org, '2140', 'دائنون', 'LIAB')
    if not expense or not payables:
        return

    existing = JournalEntry.objects.filter(reference=f"PURCH-{purchase.id}", journal_type='auto').exists()
    if existing:
        return

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            branch=purchase.branch,
            entry_number=_get_next_entry_number(),
            entry_date=purchase.purchase_date,
            journal_type='auto',
            description=f"فاتورة مشتريات {purchase.purchase_number}",
            reference=f"PURCH-{purchase.id}",
            is_posted=True,
            created_by=user,
        )
        JournalLine.objects.create(journal_entry=entry, account=expense, debit=purchase.total, credit=Decimal('0'), description='مشتريات', line_order=0)
        JournalLine.objects.create(journal_entry=entry, account=payables, debit=Decimal('0'), credit=purchase.total, description='ذمم موردين', line_order=1)
        entry._recalculate_totals()
        return entry
