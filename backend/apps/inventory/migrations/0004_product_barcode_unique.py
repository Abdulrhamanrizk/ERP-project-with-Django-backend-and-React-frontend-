# Generated for STEP 2 - Barcode unique constraint when not empty

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_category_costing_product_costing_warranty_supplier'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='product',
            constraint=models.UniqueConstraint(
                condition=~models.Q(barcode=''),
                fields=('barcode',),
                name='product_barcode_unique_when_not_empty',
            ),
        ),
    ]
