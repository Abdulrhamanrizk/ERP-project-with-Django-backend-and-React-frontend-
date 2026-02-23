# Generated for Phase 2 & 3 - Category costing_method, Product costing_method, warranty_months, default_supplier

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_party'),
        ('inventory', '0002_category_unique_code_when_not_empty'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='costing_method',
            field=models.CharField(
                blank=True,
                choices=[('FIFO', 'أول وارد أول صادر'), ('AVERAGE', 'المتوسط المرجح')],
                default='AVERAGE',
                max_length=20,
                verbose_name='طريقة التكلفة',
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='costing_method',
            field=models.CharField(
                blank=True,
                choices=[('FIFO', 'أول وارد أول صادر'), ('AVERAGE', 'المتوسط المرجح')],
                max_length=20,
                verbose_name='طريقة التكلفة',
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='warranty_months',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='مدة الضمان بالشهور'),
        ),
        migrations.AddField(
            model_name='product',
            name='default_supplier',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='default_products',
                to='core.party',
                verbose_name='المورد الافتراضي',
            ),
        ),
    ]
