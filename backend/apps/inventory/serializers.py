from decimal import Decimal
from rest_framework import serializers
from apps.core.models import Party
from .models import Category, Product, ProductSerial, ProductCost, StockMovement
from .services import get_next_sku_simple, get_next_barcode, ensure_product_sku_barcode


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'organization', 'parent', 'name', 'name_en', 'code', 'description', 'costing_method', 'is_active']


class ProductCostSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = ProductCost
        fields = ['id', 'product', 'branch', 'branch_name', 'purchase_price', 'extra_expenses', 'actual_cost', 'selling_price']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    costs = ProductCostSerializer(many=True, read_only=True)
    selling_price = serializers.SerializerMethodField()
    purchase_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'organization', 'category', 'category_name', 'sku', 'name', 'name_en',
            'description', 'barcode', 'unit', 'track_serial', 'min_stock', 'costing_method',
            'warranty_months', 'default_supplier', 'is_active',
            'selling_price', 'purchase_price', 'costs'
        ]

    def get_selling_price(self, obj):
        """First branch cost selling_price, or 0."""
        cost = obj.costs.first()
        return str(cost.selling_price) if cost else '0'

    def get_purchase_price(self, obj):
        cost = obj.costs.first()
        return str(cost.purchase_price) if cost else '0'


class ProductWriteSerializer(serializers.ModelSerializer):
    """Create/update product with optional selling_price, purchase_price, opening_stock."""
    selling_price = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0'), default=Decimal('0'))
    purchase_price = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0'))
    costing_method = serializers.CharField(required=False, allow_blank=True)
    warranty_months = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    default_supplier = serializers.PrimaryKeyRelatedField(
        queryset=Party.objects.all(),
        required=False,
        allow_null=True
    )
    opening_stock_enabled = serializers.BooleanField(required=False, default=False)
    opening_branch_id = serializers.IntegerField(required=False, allow_null=True)
    opening_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0.01'))
    opening_unit_cost = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0'))
    opening_note = serializers.CharField(required=False, allow_blank=True, default='رصيد افتتاحي')

    class Meta:
        model = Product
        fields = [
            'organization', 'category', 'sku', 'name', 'name_en', 'description', 'barcode',
            'unit', 'track_serial', 'min_stock', 'costing_method', 'warranty_months', 'default_supplier', 'is_active',
            'selling_price', 'purchase_price',
            'opening_stock_enabled', 'opening_branch_id', 'opening_quantity', 'opening_unit_cost', 'opening_note',
        ]

    def validate_sku(self, value):
        if value and value.strip():
            org = self.initial_data.get('organization')
            if org:
                qs = Product.objects.filter(organization_id=org, sku=value.strip())
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError('الرمز (SKU) مستخدم مسبقاً')
        return value or ''

    def validate_barcode(self, value):
        if value and value.strip():
            qs = Product.objects.filter(barcode=value.strip())
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError('الباركود مستخدم مسبقاً')
        return value or ''

    def validate(self, data):
        if data.get('opening_stock_enabled'):
            bid = data.get('opening_branch_id')
            qty = data.get('opening_quantity')
            if not bid:
                raise serializers.ValidationError({'opening_branch_id': 'الفرع مطلوب لإضافة رصيد افتتاحي'})
            if not qty or qty <= 0:
                raise serializers.ValidationError({'opening_quantity': 'الكمية يجب أن تكون أكبر من صفر'})
            if data.get('track_serial') and qty != int(qty):
                raise serializers.ValidationError({'opening_quantity': 'للمنتجات ذات الرقم المسلسل يجب أن تكون الكمية عدداً صحيحاً'})
        # Validate default_supplier belongs to same organization and is a supplier
        default_supplier = data.get('default_supplier')
        org_id = data.get('organization') or (getattr(self.instance, 'organization_id', None) if self.instance else None)
        if default_supplier and org_id:
            if default_supplier.organization_id != org_id:
                raise serializers.ValidationError({'default_supplier': 'المورد يجب أن ينتمي لنفس المنظمة'})
            if not default_supplier.is_supplier:
                raise serializers.ValidationError({'default_supplier': 'الطرف المحدد ليس مورداً'})
        return data

    def create(self, validated_data):
        from django.db import transaction
        from apps.core.utils.branch_permissions import validate_branch_access

        # Inherit costing_method from category if product's is empty
        costing_method = validated_data.get('costing_method') or ''
        category = validated_data.get('category')
        if not costing_method.strip() and category and getattr(category, 'costing_method', None):
            validated_data['costing_method'] = category.costing_method

        selling_price = validated_data.pop('selling_price', None)
        purchase_price = validated_data.pop('purchase_price', None)
        opening_stock_enabled = validated_data.pop('opening_stock_enabled', False)
        opening_branch_id = validated_data.pop('opening_branch_id', None)
        opening_quantity = validated_data.pop('opening_quantity', None)
        opening_unit_cost = validated_data.pop('opening_unit_cost', None)
        opening_note = validated_data.pop('opening_note', 'رصيد افتتاحي')

        request = self.context.get('request')
        user = request.user if request else None

        with transaction.atomic():
            product = Product.objects.create(**validated_data)
            ensure_product_sku_barcode(product)

            branch_for_cost = None
            if opening_stock_enabled and opening_branch_id:
                allowed, _ = validate_branch_access(user, opening_branch_id)
                if not allowed:
                    raise serializers.ValidationError({'opening_branch_id': 'ليس لديك صلاحية الوصول لهذا الفرع'})
                from apps.core.models import Branch
                try:
                    branch = Branch.objects.get(pk=opening_branch_id)
                except Branch.DoesNotExist:
                    raise serializers.ValidationError({'opening_branch_id': 'الفرع غير موجود'})
                if not branch.is_active:
                    raise serializers.ValidationError({'opening_branch_id': 'الفرع غير نشط'})
                if branch.organization_id != product.organization_id:
                    raise serializers.ValidationError({'opening_branch_id': 'الفرع لا ينتمي للمنظمة نفسها'})
                branch_for_cost = branch

                StockMovement.objects.create(
                    branch=branch,
                    product=product,
                    movement_type='opening_balance',
                    quantity=opening_quantity,
                    reference=opening_note or 'رصيد افتتاحي',
                    notes=opening_note or 'رصيد افتتاحي',
                    created_by=user,
                )

            if selling_price is not None or purchase_price is not None:
                if not branch_for_cost:
                    org = product.organization
                    branch_for_cost = org.branches.filter(is_active=True).first() if org else None
                if branch_for_cost:
                    purchase = purchase_price if purchase_price is not None else Decimal('0')
                    selling = selling_price if selling_price is not None else Decimal('0')
                    if opening_stock_enabled and opening_unit_cost is not None:
                        purchase = opening_unit_cost
                    ProductCost.objects.update_or_create(
                        product=product,
                        branch=branch_for_cost,
                        defaults={
                            'purchase_price': purchase,
                            'selling_price': selling,
                            'extra_expenses': Decimal('0'),
                        }
                    )

        return product

    def update(self, instance, validated_data):
        for k in ['selling_price', 'purchase_price', 'opening_stock_enabled', 'opening_branch_id',
                  'opening_quantity', 'opening_unit_cost', 'opening_note']:
            validated_data.pop(k, None)
        ensure_product_sku_barcode(instance)
        return super().update(instance, validated_data)


class ProductSerialSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ProductSerial
        fields = ['id', 'product', 'product_name', 'branch', 'serial_number', 'status']


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = StockMovement
        fields = ['id', 'branch', 'branch_name', 'product', 'product_name', 'movement_type', 'quantity', 'reference', 'notes', 'created_at']
