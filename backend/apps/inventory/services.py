"""
Product and inventory business logic.
"""
from decimal import Decimal

from .models import Product, ProductCost, StockMovement


def get_next_sku_simple(organization_id: int) -> str:
    """Simple SKU generation: find max numeric suffix."""
    products = Product.objects.filter(organization_id=organization_id, sku__istartswith='PRD-')
    max_num = 0
    for p in products.values_list('sku', flat=True)[:1000]:
        if p and len(p) > 4:
            try:
                n = int(p[4:].lstrip('-'))
                if n > max_num:
                    max_num = n
            except ValueError:
                pass
    return f"PRD-{max_num + 1:06d}"


def get_next_barcode() -> str:
    """Generate unique numeric barcode (EAN-13 style, 13 digits)."""
    # Use a base to avoid collisions with real barcodes (2xxxx = internal)
    prefix = "2000000"
    products = Product.objects.filter(barcode__startswith=prefix).values_list('barcode', flat=True)
    max_seq = 0
    for b in products:
        if b and len(b) >= 13 and b[:7] == prefix and b[7:].isdigit():
            try:
                n = int(b[7:13])
                if n > max_seq:
                    max_seq = n
            except ValueError:
                pass
    return f"{prefix}{max_seq + 1:06d}"


def ensure_product_sku_barcode(product: Product) -> None:
    """Fill SKU and/or barcode if empty. Saves the product."""
    updated = False
    if not product.sku or not product.sku.strip():
        product.sku = get_next_sku_simple(product.organization_id)
        updated = True
    if not product.barcode or not product.barcode.strip():
        product.barcode = get_next_barcode()
        updated = True
    if updated:
        product.save(update_fields=['sku', 'barcode'])
