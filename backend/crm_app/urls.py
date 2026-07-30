from django.urls import path, re_path
from . import views

urlpatterns = [
    # Health
    re_path(r'^health/?$', views.health, name='health'),

    # Auth
    re_path(r'^auth/admin-exists/?$', views.admin_exists, name='admin-exists'),
    re_path(r'^auth/signup/?$', views.signup, name='signup'),
    re_path(r'^auth/login/?$', views.login, name='login'),
    re_path(r'^auth/verify-otp/?$', views.verify_otp, name='verify-otp'),
    re_path(r'^auth/me/?$', views.me, name='me'),

    # Dashboard
    re_path(r'^dashboard/summary/?$', views.dashboard_summary, name='dashboard-summary'),
    re_path(r'^dashboard/monthly-collection/?$', views.dashboard_monthly_collection, name='dashboard-monthly-collection'),

    # Customers
    re_path(r'^customers/expiring-soon/?$', views.expiring_soon, name='expiring-soon'),
    re_path(r'^customers/?$', views.customer_list_create, name='customer-list-create'),
    re_path(r'^customers/(?P<pk>[0-9a-f-]+)/?$', views.customer_detail, name='customer-detail'),
    re_path(r'^customers/(?P<pk>[0-9a-f-]+)/send-reminder/?$', views.send_reminder, name='send-reminder'),

    # Payments & Receipts
    re_path(r'^payments/?$', views.record_payment, name='record-payment'),
    re_path(r'^receipts/?$', views.overall_receipts, name='overall-receipts'),
    re_path(r'^receipts/(?P<customer_id>[0-9a-f-]+)/?$', views.get_receipt, name='get-receipt'),
    re_path(r'^receipts/(?P<customer_id>[0-9a-f-]+)/pdf/?$', views.get_receipt_pdf, name='get-receipt-pdf'),
]
