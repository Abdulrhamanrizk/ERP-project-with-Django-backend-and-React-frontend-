from rest_framework import serializers
from .models import MaintenanceOrder


def get_next_order_number():
    from django.db.models import Max
    last = MaintenanceOrder.objects.aggregate(Max('id'))['id__max'] or 0
    return f"M-{last + 1:05d}"


class MaintenanceOrderSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(required=False, allow_blank=True)

    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = MaintenanceOrder
        fields = ['id', 'branch', 'branch_name', 'order_number', 'customer_name', 'customer_phone', 'device_description', 'status', 'notes', 'created_at']

    def create(self, validated_data):
        if not validated_data.get('order_number'):
            validated_data['order_number'] = get_next_order_number()
        return MaintenanceOrder.objects.create(**validated_data)
