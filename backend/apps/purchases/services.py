"""خدمات دورة المشتريات: إضافة المخزون عند التأكيد وخصمه عند المرتجع"""
from decimal import Decimal
from django.db.models import Sum

from apps.inventory.models import StockMovement


def deduct_stock_for_purchase_return(purchase_return, user=None):
    """خصم الكميات من المخزون عند تأكيد مرتجع المشتريات.
    حركة return_out: إرجاع البضاعة للمورد.
    idempotent: لا يُنفّذ إذا وُجدت حركات مسبقاً لهذا المرتجع.
    """
    ref = f"PRETURN-{purchase_return.id}"
    if StockMovement.objects.filter(reference=ref, movement_type='return_out').exists():
        return

    branch = purchase_return.purchase.branch
    for item in purchase_return.items.select_related('purchase_item__product').all():
        StockMovement.objects.create(
            branch=branch,
            product=item.purchase_item.product,
            movement_type='return_out',
            quantity=item.quantity,
            reference=ref,
            notes=f"مرتجع مشتريات {purchase_return.return_number}",
            created_by=user,
        )


def validate_purchase_return_quantities(purchase_return):
    """التحقق من أن كميات المرتجع لا تتجاوز المشترى ولا تتجاوز الرصيد المتاح."""
    from .models import PurchaseReturnItem
    from apps.sales.services import get_stock

    short = []
    branch_id = purchase_return.purchase.branch_id
    for item in purchase_return.items.select_related('purchase_item__product').all():
        purchase_item = item.purchase_item
        already_returned = (
            PurchaseReturnItem.objects.filter(
                purchase_item=purchase_item,
                purchase_return__status='confirmed'
            )
            .exclude(purchase_return=purchase_return)
            .aggregate(s=Sum('quantity'))['s'] or Decimal('0')
        )
        max_by_purchase = purchase_item.quantity - already_returned
        available_stock = get_stock(purchase_item.product_id, branch_id)
        max_allowed = min(max_by_purchase, available_stock)
        if item.quantity > max_by_purchase:
            short.append({
                'purchase_item_id': purchase_item.id,
                'product_name': purchase_item.product.name,
                'returned': float(item.quantity),
                'max_allowed': float(max_by_purchase),
                'reason': 'تجاوز الكمية المشتراة',
            })
        elif item.quantity > available_stock:
            short.append({
                'purchase_item_id': purchase_item.id,
                'product_name': purchase_item.product.name,
                'returned': float(item.quantity),
                'max_allowed': float(available_stock),
                'reason': f'نقص المخزون (متاح: {available_stock})',
            })
    return short


def add_stock_for_purchase(purchase, user=None):
    """إضافة الكميات للمخزون عند تأكيد فاتورة المشتريات.
    يُنشئ حركات إدخال (in) لكل بند مع reference PURCH-{purchase.id}
    idempotent: لا يُنفّذ إذا وُجدت حركات مسبقاً لهذه الفاتورة.
    """
    ref = f"PURCH-{purchase.id}"
    if StockMovement.objects.filter(reference=ref, movement_type='in').exists():
        return

    branch = purchase.branch
    for item in purchase.items.select_related('product').all():
        StockMovement.objects.create(
            branch=branch,
            product=item.product,
            movement_type='in',
            quantity=item.quantity,
            reference=ref,
            notes=f"فاتورة مشتريات {purchase.purchase_number}",
            created_by=user,
        )
