"""خدمات دورة المبيعات: التحقق من المخزون وخصم الكميات"""
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum

from apps.inventory.models import StockMovement


def get_total_returned_amount(sale):
    """مجموع المرتجعات المؤكدة للفاتورة"""
    from .models import SaleReturn
    return (
        SaleReturn.objects.filter(sale=sale, status='confirmed')
        .aggregate(s=Sum('total'))['s'] or Decimal('0')
    )


def recalculate_sale_payment_status(sale):
    """إعادة حساب paid_amount و payment_status للفاتورة.
    - بيع نقدي مؤكد: paid_amount = total (لا يوجد سندات قبض منفصلة).
    - بيع آجل: paid_amount = مجموع سندات القبض المرحلة المرتبطة بهذه الفاتورة.
    - يراعي المرتجعات: الصافي = total - sum(returns)، due = صافي - paid.
    """
    from apps.treasury.models import Payment

    if sale.status == 'cancelled':
        return

    total_returned = get_total_returned_amount(sale)
    net_total = sale.total - total_returned

    if sale.payment_type == 'cash' and sale.status == 'confirmed':
        # البيع النقدي: المبلغ مُستلم عند التأكيد (قبل المرتجعات)
        sale.paid_amount = sale.total
        # حالة السداد تعتمد على الصافي بعد المرتجعات
        if net_total <= 0:
            status = 'paid'
        elif sale.paid_amount >= net_total:
            status = 'paid'
        elif sale.paid_amount > 0:
            status = 'partial'
        else:
            status = 'unpaid'
        sale.payment_status = status
        sale.save(update_fields=['paid_amount', 'payment_status'])
        return

    # البيع الآجل: جمع سندات القبض المرحلة المرتبطة بالفاتورة
    total_paid = (
        Payment.objects.filter(sale=sale, payment_type='receipt', is_posted=True)
        .aggregate(s=Sum('amount'))['s'] or Decimal('0')
    )
    capped = min(total_paid, sale.total)
    due = net_total - capped
    if due <= 0 or capped >= net_total:
        status = 'paid'
    elif capped > 0:
        status = 'partial'
    else:
        status = 'unpaid'

    sale.paid_amount = capped
    sale.payment_status = status
    sale.save(update_fields=['paid_amount', 'payment_status'])


IN_TYPES = ['in', 'return_in', 'opening_balance']
OUT_TYPES = ['out', 'return_out', 'transfer']


def get_stock(product_id, branch_id):
    """حساب الرصيد المتاح لمنتج في فرع"""
    incoming = StockMovement.objects.filter(
        branch_id=branch_id, product_id=product_id, movement_type__in=IN_TYPES
    ).aggregate(s=Sum('quantity'))['s'] or Decimal('0')
    outgoing = StockMovement.objects.filter(
        branch_id=branch_id, product_id=product_id, movement_type__in=OUT_TYPES
    ).aggregate(s=Sum('quantity'))['s'] or Decimal('0')
    return incoming - outgoing


def validate_sale_stock(sale, allow_negative=False):
    """التحقق من توفر المخزون لبند الفاتورة.
    يرجع قائمة من {product_name, requested, available} للبنود غير المتوفرة.
    إذا allow_negative=True لا يتحقق (للإعدادات التي تسمح بالبيع بالسالب).
    """
    if allow_negative:
        return []
    short = []
    branch_id = sale.branch_id
    for item in sale.items.select_related('product').all():
        available = get_stock(item.product_id, branch_id)
        if available < item.quantity:
            short.append({
                'product_name': item.product.name,
                'requested': float(item.quantity),
                'available': float(available),
            })
    return short


def deduct_stock_for_sale(sale, user=None):
    """خصم الكميات من المخزون عند تأكيد الفاتورة.
    يُنشئ حركات إخراج (out) لكل بند مع reference SALE-{sale.id}
    """
    branch = sale.branch
    ref = f"SALE-{sale.id}"
    for item in sale.items.select_related('product').all():
        StockMovement.objects.create(
            branch=branch,
            product=item.product,
            movement_type='out',
            quantity=item.quantity,
            reference=ref,
            notes=f"فاتورة مبيعات {sale.sale_number}",
            created_by=user,
        )


def restore_stock_for_sale_return(sale_return, user=None):
    """إرجاع الكميات للمخزون عند تأكيد المرتجع.
    يُنشئ حركات return_in لكل بند مرتجع.
    """
    branch = sale_return.sale.branch
    ref = f"RETURN-{sale_return.id}"
    for item in sale_return.items.select_related('sale_item__product').all():
        StockMovement.objects.create(
            branch=branch,
            product=item.sale_item.product,
            movement_type='return_in',
            quantity=item.quantity,
            reference=ref,
            notes=f"مرتجع مبيعات {sale_return.return_number}",
            created_by=user,
        )


def create_cash_sale_receipt(sale, user=None):
    """إنشاء سند قبض تلقائي للبيع النقدي المؤكد."""
    if sale.payment_type != 'cash' or not sale.cash_account_id:
        return None
    from apps.treasury.models import Payment
    if Payment.objects.filter(sale=sale, payment_type='receipt').exists():
        return None
    return Payment.objects.create(
        branch=sale.branch,
        cash_account=sale.cash_account,
        payment_type='receipt',
        source_type='customer',
        party=sale.customer,
        sale=sale,
        amount=sale.total,
        payment_date=sale.sale_date,
        reference=sale.sale_number,
        description=f'مقبوض - فاتورة مبيعات {sale.sale_number}',
        is_posted=True,
        created_by=user,
    )


def create_cash_sale_return_payment(sale_return, user=None):
    """إنشاء سند صرف تلقائي لمرتجع بيع نقدي (إرجاع النقود للعميل)."""
    sale = sale_return.sale
    if sale.payment_type != 'cash' or not sale.cash_account_id:
        return None
    from apps.treasury.models import Payment
    if Payment.objects.filter(
        payment_type='payment',
        reference=f'RETURN-{sale_return.id}',
    ).exists():
        return None
    return Payment.objects.create(
        branch=sale_return.branch,
        cash_account=sale.cash_account,
        payment_type='payment',
        source_type='customer',
        party=sale.customer,
        amount=sale_return.total,
        payment_date=sale_return.return_date,
        reference=f'RETURN-{sale_return.id}',
        description=f'مرتجع مبيعات {sale_return.return_number}',
        is_posted=True,
        created_by=user,
    )


def validate_return_quantities(sale_return):
    """التحقق من أن كميات المرتجع لا تتجاوز المباع.
    يرجع قائمة من {sale_item_id, product_name, returned, max_allowed}.
    """
    from .models import SaleReturnItem

    short = []
    for item in sale_return.items.select_related('sale_item__product').all():
        sale_item = item.sale_item
        already_returned = (
            SaleReturnItem.objects.filter(
                sale_item=sale_item,
                sale_return__status='confirmed'
            )
            .exclude(sale_return=sale_return)
            .aggregate(s=Sum('quantity'))['s'] or Decimal('0')
        )
        max_allowed = sale_item.quantity - already_returned
        if item.quantity > max_allowed:
            short.append({
                'sale_item_id': sale_item.id,
                'product_name': sale_item.product.name,
                'returned': float(item.quantity),
                'max_allowed': float(max_allowed),
            })
    return short
