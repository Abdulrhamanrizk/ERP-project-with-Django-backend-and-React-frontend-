from rest_framework import serializers
from decimal import Decimal
from .models import Sale, SaleItem, SaleReturn, SaleReturnItem


def get_next_sale_number():
    from django.db.models import Max
    last = Sale.objects.aggregate(Max('id'))['id__max'] or 0
    return f"S-{last + 1:05d}"


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'discount', 'line_total']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    due_amount = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'branch', 'customer', 'customer_name', 'sale_number', 'sale_date',
            'status', 'payment_type', 'payment_status', 'cash_account',
            'total', 'paid_amount', 'due_amount', 'discount', 'notes', 'items'
        ]

    def get_due_amount(self, obj):
        from .services import get_total_returned_amount
        net = obj.total - get_total_returned_amount(obj)
        return max(net - obj.paid_amount, 0)


def get_next_return_number():
    from django.db.models import Max
    last = SaleReturn.objects.aggregate(Max('id'))['id__max'] or 0
    return f"R-{last + 1:05d}"


class SaleReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='sale_item.product.name', read_only=True)

    class Meta:
        model = SaleReturnItem
        fields = ['id', 'sale_item', 'product_name', 'quantity', 'unit_price', 'line_total']


class SaleReturnSerializer(serializers.ModelSerializer):
    items = SaleReturnItemSerializer(many=True, read_only=True)
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)

    class Meta:
        model = SaleReturn
        fields = ['id', 'branch', 'sale', 'sale_number', 'return_number', 'return_date', 'status', 'total', 'notes', 'items']


class SaleReturnWriteSerializer(serializers.ModelSerializer):
    items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        help_text='[{sale_item: id, quantity: number}, ...]'
    )

    class Meta:
        model = SaleReturn
        fields = ['sale', 'return_date', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        sale = validated_data['sale']
        validated_data['branch'] = sale.branch
        validated_data['return_number'] = get_next_return_number()
        total = Decimal('0')
        return_obj = SaleReturn.objects.create(**validated_data)
        for item_data in items_data:
            sale_item = SaleItem.objects.get(id=item_data['sale_item'])
            qty = Decimal(str(item_data['quantity']))
            if qty <= 0:
                continue
            price = sale_item.unit_price
            line_total = qty * price
            total += line_total
            SaleReturnItem.objects.create(
                sale_return=return_obj,
                sale_item=sale_item,
                quantity=qty,
                unit_price=price,
                line_total=line_total,
            )
        return_obj.total = total
        return_obj.save(update_fields=['total'])
        return return_obj


class SaleWriteSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    sale_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Sale
        fields = ['id', 'branch', 'customer', 'sale_number', 'sale_date', 'status', 'payment_type', 'cash_account', 'total', 'discount', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not validated_data.get('sale_number'):
            validated_data['sale_number'] = get_next_sale_number()
        total = Decimal('0')
        for item in items_data:
            qty = Decimal(str(item['quantity']))
            price = Decimal(str(item['unit_price']))
            disc = Decimal(str(item.get('discount', 0)))
            item['line_total'] = qty * price - disc
            total += item['line_total']
        validated_data['total'] = total - Decimal(str(validated_data.get('discount', 0)))
        sale = Sale.objects.create(**validated_data)
        for item in items_data:
            SaleItem.objects.create(sale=sale, **item)
        return sale
