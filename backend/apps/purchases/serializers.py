from rest_framework import serializers
from decimal import Decimal
from .models import Purchase, PurchaseItem, PurchaseReturn, PurchaseReturnItem


def get_next_purchase_number():
    from django.db.models import Max
    last = Purchase.objects.aggregate(Max('id'))['id__max'] or 0
    return f"P-{last + 1:05d}"


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'discount', 'line_total']


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    stock_posted = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = ['id', 'branch', 'supplier', 'supplier_name', 'purchase_number', 'purchase_date', 'status', 'total', 'discount', 'notes', 'stock_posted', 'items']

    def get_stock_posted(self, obj):
        if obj.status != 'confirmed':
            return False
        from apps.inventory.models import StockMovement
        return StockMovement.objects.filter(reference=f"PURCH-{obj.id}", movement_type='in').exists()


class PurchaseWriteSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True)
    purchase_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Purchase
        fields = ['id', 'branch', 'supplier', 'purchase_number', 'purchase_date', 'status', 'total', 'discount', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not validated_data.get('purchase_number'):
            validated_data['purchase_number'] = get_next_purchase_number()
        total = Decimal('0')
        for item in items_data:
            qty = Decimal(str(item['quantity']))
            price = Decimal(str(item['unit_price']))
            disc = Decimal(str(item.get('discount', 0)))
            item['line_total'] = qty * price - disc
            total += item['line_total']
        validated_data['total'] = total - Decimal(str(validated_data.get('discount', 0)))
        purchase = Purchase.objects.create(**validated_data)
        for item in items_data:
            PurchaseItem.objects.create(purchase=purchase, **item)
        return purchase


def get_next_return_number():
    from django.db.models import Max
    last = PurchaseReturn.objects.aggregate(Max('id'))['id__max'] or 0
    return f"PR-{last + 1:05d}"


class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='purchase_item.product.name', read_only=True)

    class Meta:
        model = PurchaseReturnItem
        fields = ['id', 'purchase_item', 'product_name', 'quantity', 'unit_price', 'line_total']


class PurchaseReturnSerializer(serializers.ModelSerializer):
    items = PurchaseReturnItemSerializer(many=True, read_only=True)
    purchase_number = serializers.CharField(source='purchase.purchase_number', read_only=True)

    class Meta:
        model = PurchaseReturn
        fields = ['id', 'branch', 'purchase', 'purchase_number', 'return_number', 'return_date', 'status', 'total', 'notes', 'items']


class PurchaseReturnWriteSerializer(serializers.ModelSerializer):
    items = serializers.ListField(child=serializers.DictField(), write_only=True)

    class Meta:
        model = PurchaseReturn
        fields = ['purchase', 'return_date', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        purchase = validated_data['purchase']
        validated_data['branch'] = purchase.branch
        validated_data['return_number'] = get_next_return_number()
        total = Decimal('0')
        return_obj = PurchaseReturn.objects.create(**validated_data)
        for item_data in items_data:
            purchase_item = PurchaseItem.objects.get(id=item_data['purchase_item'])
            qty = Decimal(str(item_data['quantity']))
            if qty <= 0:
                continue
            price = purchase_item.unit_price
            line_total = qty * price
            total += line_total
            PurchaseReturnItem.objects.create(
                purchase_return=return_obj,
                purchase_item=purchase_item,
                quantity=qty,
                unit_price=price,
                line_total=line_total,
            )
        return_obj.total = total
        return_obj.save(update_fields=['total'])
        return return_obj
