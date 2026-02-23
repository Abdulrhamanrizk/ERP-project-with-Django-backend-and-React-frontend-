from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Organization, Branch, User, UserBranchAssignment, Party


class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = Party
        fields = ['id', 'organization', 'name', 'name_en', 'code', 'phone', 'email', 'address', 'tax_id', 'is_customer', 'is_supplier', 'is_active']


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'name_en', 'tax_id', 'address', 'phone', 'email', 'is_active']


class BranchSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Branch
        fields = [
            'id', 'organization', 'organization_name', 'name', 'name_en', 'code',
            'address', 'phone', 'is_main', 'is_active'
        ]


class UserSerializer(serializers.ModelSerializer):
    branches = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone',
            'organization', 'default_branch', 'preferred_language', 'branches', 'is_active'
        ]
        read_only_fields = ['id', 'username']

    def get_branches(self, obj):
        assignments = UserBranchAssignment.objects.filter(user=obj).select_related('branch')
        return [{'id': a.branch.id, 'name': a.branch.name} for a in assignments]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('بيانات الدخول غير صحيحة')
        if not user.is_active:
            raise serializers.ValidationError('الحساب غير مفعّل')
        data['user'] = user
        return data
