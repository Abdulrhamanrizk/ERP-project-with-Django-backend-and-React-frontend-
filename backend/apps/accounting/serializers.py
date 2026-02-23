from rest_framework import serializers
from decimal import Decimal
from .models import Account, AccountType, JournalEntry, JournalLine, CostCenter


class AccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = ['id', 'code', 'name', 'name_en', 'natural_balance']


class AccountSerializer(serializers.ModelSerializer):
    account_type_name = serializers.CharField(source='account_type.name', read_only=True)

    class Meta:
        model = Account
        fields = [
            'id', 'organization', 'parent', 'account_type', 'account_type_name',
            'code', 'name', 'name_en', 'is_system', 'is_active'
        ]


class CostCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCenter
        fields = ['id', 'organization', 'code', 'name', 'name_en', 'is_active']


class JournalLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)

    class Meta:
        model = JournalLine
        fields = [
            'id', 'account', 'account_code', 'account_name', 'cost_center',
            'debit', 'credit', 'description', 'line_order'
        ]
        extra_kwargs = {'account': {'required': True}}


def _validate_balanced(lines_data):
    """التحقق من أن إجمالي المدين = إجمالي الدائن"""
    total_debit = sum(Decimal(str(l.get('debit', 0))) for l in lines_data)
    total_credit = sum(Decimal(str(l.get('credit', 0))) for l in lines_data)
    if total_debit != total_credit:
        diff = total_debit - total_credit
        raise serializers.ValidationError({
            'lines': f'القيد غير متوازن: إجمالي المدين ({total_debit}) ≠ إجمالي الدائن ({total_credit}). الفرق: {diff}'
        })


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    entry_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'branch', 'branch_name', 'entry_number', 'entry_date',
            'journal_type', 'description', 'reference', 'is_posted',
            'total_debit', 'total_credit', 'lines'
        ]
        read_only_fields = ['total_debit', 'total_credit']

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError('يجب أن يحتوي القيد على بند واحد على الأقل')
        _validate_balanced(value)
        return value

    def create(self, validated_data):
        from django.db.models import Max
        from .models import is_date_locked
        lines_data = validated_data.pop('lines', [])
        entry_date = validated_data.get('entry_date')
        branch = validated_data.get('branch')
        if branch and entry_date and is_date_locked(branch.organization, entry_date):
            raise serializers.ValidationError({'entry_date': 'الفترة المالية لهذا التاريخ مقفولة'})
        _validate_balanced(lines_data)
        if not validated_data.get('entry_number'):
            last = JournalEntry.objects.aggregate(Max('id'))['id__max'] or 0
            validated_data['entry_number'] = f"J-{last + 1:05d}"
        entry = JournalEntry.objects.create(**validated_data)
        for i, line_data in enumerate(lines_data):
            line_data['line_order'] = i
            JournalLine.objects.create(journal_entry=entry, **line_data)
        entry._recalculate_totals()
        return entry

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        if lines_data is not None:
            _validate_balanced(lines_data)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            for i, line_data in enumerate(lines_data):
                line_data['line_order'] = i
                JournalLine.objects.create(journal_entry=instance, **line_data)
            instance._recalculate_totals()
        return instance
