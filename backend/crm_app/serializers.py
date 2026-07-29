from rest_framework import serializers
from .models import Admin, OTP, Customer, Payment, MessageLog

class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ['id', 'name', 'email', 'is_verified', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'customer_id', 'amount', 'payment_date', 'method', 'receipt_number', 'created_at']


class CustomerSerializer(serializers.ModelSerializer):
    amount_pending = serializers.ReadOnlyField()
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'contact_number', 'category', 'vehicle_number',
            'start_date', 'end_date', 'amount_total', 'amount_paid',
            'amount_pending', 'notes', 'needs_reminder', 'created_at', 'updated_at', 'payments'
        ]


class MessageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageLog
        fields = ['id', 'customer_id', 'category', 'message_body', 'sent_at', 'status', 'provider_response']
