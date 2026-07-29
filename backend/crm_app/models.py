import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import bcrypt

class Admin(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.pk and Admin.objects.count() >= 1:
            raise ValidationError("Only one admin account is allowed.")
        super().save(*args, **kwargs)

    def set_password(self, raw_password):
        self.password_hash = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, raw_password):
        return bcrypt.checkpw(raw_password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def __str__(self):
        return f"{self.name} ({self.email})"


class OTP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin = models.ForeignKey(Admin, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    purpose = models.CharField(max_length=20, default='login')
    consumed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return not self.consumed and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP {self.code} for {self.admin.email}"


class Customer(models.Model):
    CATEGORY_CHOICES = [
        ('insurance', 'Insurance'),
        ('permit', 'Permit'),
        ('fitness_puc', 'Fitness / PUC'),
        ('license', 'License'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    contact_number = models.CharField(max_length=20)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    vehicle_number = models.CharField(max_length=20, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    amount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    needs_reminder = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def amount_pending(self):
        total = float(self.amount_total or 0)
        paid = float(self.amount_paid or 0)
        return f"{(total - paid):.2f}"

    def __str__(self):
        return f"{self.name} - {self.category}"


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    method = models.CharField(max_length=50, blank=True, null=True)
    receipt_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment ₹{self.amount} for {self.customer.name}"


class MessageLog(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('stub', 'Stub'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='message_logs')
    category = models.CharField(max_length=20)
    message_body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='stub')
    provider_response = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Message to {self.customer.name} [{self.status}]"
