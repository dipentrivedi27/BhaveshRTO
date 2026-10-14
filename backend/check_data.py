import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from customers.models import Customer
from payments.models import ManualReceipt, Payment
from dashboard.views import _category_summary, DASHBOARD_CATEGORIES, _entered_customers

print("--- CUSTOMER TOTALS ---")
print("Total Customer rows:", Customer.objects.count())
print("is_broker=False rows:", Customer.objects.exclude(is_broker=True).count())
print("is_broker=True rows:", Customer.objects.filter(is_broker=True).count())
print("is_broker=False, start_date is NULL:", Customer.objects.exclude(is_broker=True).filter(start_date__isnull=True).count())
for c in Customer.objects.exclude(is_broker=True).filter(start_date__isnull=True):
    print(f"  NULL start_date: id={c.id}, name={c.name}, cat={c.category}, categories={c.categories}, created_at={c.created_at}")

print("\n--- YEARS IN DB ---")
from dashboard.views import _available_years
print("Available years:", _available_years())

years_in_cust = set(Customer.objects.exclude(is_broker=True).exclude(start_date__isnull=True).values_list('start_date__year', flat=True))
print("Customer start_date years:", years_in_cust)
created_at_years = set(Customer.objects.exclude(is_broker=True).values_list('created_at__year', flat=True))
print("Customer created_at years:", created_at_years)

print("\n--- CATEGORY BREAKDOWN ---")
from django.db.models import Q
for choice_val, choice_label in Customer.Category.choices:
    primary_count = Customer.objects.exclude(is_broker=True).filter(category=choice_val).count()
    json_count = Customer.objects.exclude(is_broker=True).filter(Q(category=choice_val) | Q(categories__icontains=f'"{choice_val}"')).distinct().count()
    in_dash = choice_val in DASHBOARD_CATEGORIES
    print(f"Category '{choice_val}' ({choice_label}): primary={primary_count}, total_including_json={json_count}, in_dashboard_cards={in_dash}")

print("\n--- DASHBOARD SUMMARY WITH NO FILTER ---")
from django.contrib.auth import get_user_model
User = get_user_model()
admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
print("Using user:", admin_user)
from dashboard.views import DashboardSummaryView
from rest_framework.test import APIRequestFactory, force_authenticate
factory = APIRequestFactory()
request = factory.get('/dashboard/summary')
force_authenticate(request, user=admin_user)
view = DashboardSummaryView.as_view()
response = view(request)
print("Dashboard summary response status:", response.status_code)
if response.status_code == 200:
    print("Dashboard summary response data (no filter):", response.data['data'])
else:
    print("Error:", response.data)

print("\n--- DASHBOARD SUMMARY WITH DEFAULT FILTER (year=2026) ---")
request_2026 = factory.get('/dashboard/summary?year=2026')
force_authenticate(request_2026, user=admin_user)
response_2026 = view(request_2026)
if response_2026.status_code == 200:
    print("Dashboard summary response data (year=2026):", response_2026.data['data'])
else:
    print("Error 2026:", response_2026.data)

print("\n--- MANUAL RECEIPTS ---")
print("Total manual receipts:", ManualReceipt.objects.count())
for r in ManualReceipt.objects.all():
    print(f"  Receipt: id={r.id}, cust_name={r.name}, date={r.date}, total={r.amount_total}, paid={r.amount_paid}")
