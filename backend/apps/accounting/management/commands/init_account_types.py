from django.core.management.base import BaseCommand
from apps.accounting.models import AccountType


class Command(BaseCommand):
    help = 'تهيئة أنواع الحسابات الأساسية'

    def handle(self, *args, **options):
        types = [
            {'code': 'ASSET', 'name': 'أصول', 'name_en': 'Assets', 'natural_balance': 'D'},
            {'code': 'LIAB', 'name': 'خصوم', 'name_en': 'Liabilities', 'natural_balance': 'C'},
            {'code': 'EQ', 'name': 'حقوق ملكية', 'name_en': 'Equity', 'natural_balance': 'C'},
            {'code': 'REV', 'name': 'إيرادات', 'name_en': 'Revenue', 'natural_balance': 'C'},
            {'code': 'EXP', 'name': 'مصروفات', 'name_en': 'Expenses', 'natural_balance': 'D'},
        ]
        for t in types:
            AccountType.objects.get_or_create(code=t['code'], defaults=t)
        self.stdout.write(self.style.SUCCESS('Account types initialized'))
