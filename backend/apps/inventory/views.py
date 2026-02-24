from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from apps.core.mixins import BranchEnforcementMixin
from apps.core.permissions import CanManageStock
from .models import Category, Product, ProductSerial, ProductCost, StockMovement
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductWriteSerializer,
    ProductSerialSerializer,
    ProductCostSerializer,
    StockMovementSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.select_related('organization').all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization', 'parent', 'is_active']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'organization').prefetch_related('costs').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['organization', 'category', 'track_serial', 'is_active']
    search_fields = ['name', 'sku', 'barcode']

    def get_queryset(self):
        queryset = super().get_queryset()
        barcode = (self.request.query_params.get('barcode') or '').strip()
        if barcode:
            return queryset.filter(barcode=barcode, is_active=True).order_by('id')
        return queryset

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ProductWriteSerializer
        return ProductSerializer


class ProductSerialViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = ProductSerial.objects.select_related('product', 'branch').all()
    serializer_class = ProductSerialSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product', 'branch', 'status']

    @action(detail=False, methods=['post'], url_path='bulk-create', permission_classes=[IsAuthenticated, CanManageStock])
    def bulk_create(self, request):
        """Bulk create ProductSerial records. Expects product_id, branch_id, serial_numbers (list)."""
        product_id = request.data.get('product_id')
        branch_id = request.data.get('branch_id')
        serial_numbers = request.data.get('serial_numbers') or []
        if not product_id or not branch_id:
            return Response(
                {'detail': 'product_id و branch_id مطلوبان'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not isinstance(serial_numbers, list):
            return Response(
                {'detail': 'serial_numbers يجب أن تكون قائمة'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serials = [str(s).strip() for s in serial_numbers if s is not None and str(s).strip()]
        from apps.inventory.models import Product
        from apps.core.models import Branch
        try:
            product = Product.objects.get(pk=product_id)
            branch = Branch.objects.get(pk=branch_id)
        except (Product.DoesNotExist, Branch.DoesNotExist):
            return Response({'detail': 'المنتج أو الفرع غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        if branch.organization_id != product.organization_id:
            return Response({'detail': 'الفرع لا ينتمي لمنظمة المنتج'}, status=status.HTTP_400_BAD_REQUEST)
        if not product.track_serial:
            return Response({'detail': 'المنتج غير مُعد لتتبع الرقم المسلسل'}, status=status.HTTP_400_BAD_REQUEST)
        duplicates_in_input = []
        seen = set()
        for s in serials:
            if s in seen:
                duplicates_in_input.append(s)
            seen.add(s)
        if duplicates_in_input:
            return Response(
                {'detail': 'أرقام مكررة في الإدخال', 'duplicates': list(set(duplicates_in_input))},
                status=status.HTTP_400_BAD_REQUEST
            )
        existing = set(
            ProductSerial.objects.filter(product=product, serial_number__in=serials)
            .values_list('serial_number', flat=True)
        )
        if existing:
            return Response(
                {'detail': 'بعض الأرقام مسجلة مسبقاً', 'existing': list(existing)},
                status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            created = [
                ProductSerial.objects.create(
                    product=product,
                    branch=branch,
                    serial_number=s,
                    status='in_stock'
                )
                for s in serials
            ]
        serializer = ProductSerialSerializer(created, many=True)
        return Response({'created': serializer.data}, status=status.HTTP_201_CREATED)


class ProductCostViewSet(viewsets.ModelViewSet):
    queryset = ProductCost.objects.select_related('product', 'branch').all()
    serializer_class = ProductCostSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product', 'branch']


class StockMovementViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related('product', 'branch').all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return base + [CanManageStock()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'product', 'movement_type']
