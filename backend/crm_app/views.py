import datetime
from django.conf import settings
from django.utils import timezone
from django.db.models import Sum, Q, F
from django.http import HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Admin, OTP, Customer, Payment, MessageLog
from .serializers import AdminSerializer, CustomerSerializer, PaymentSerializer, MessageLogSerializer
from .utils import generate_otp_code, send_whatsapp_stub, generate_pdf_receipt, send_otp_email
from .authentication import JWTAuthentication, generate_token

# ─── Health check ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    return Response({'status': 'ok', 'timestamp': timezone.now().isoformat()})


# ─── Auth Views ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_exists(request):
    exists = Admin.objects.count() > 0
    return Response({'exists': exists})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def signup(request):
    if Admin.objects.count() >= 1:
        return Response(
            {'success': False, 'message': 'An admin account already exists. Signup is permanently disabled.'},
            status=status.HTTP_403_FORBIDDEN
        )
    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')

    if not name or not email or not password:
        return Response({'success': False, 'message': 'Name, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    admin = Admin(name=name, email=email, is_verified=False)
    admin.set_password(password)
    admin.save()

    return Response({
        'success': True,
        'message': 'Admin account created. Please log in.',
        'adminId': str(admin.id)
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    try:
        admin = Admin.objects.get(email=email)
    except Admin.DoesNotExist:
        return Response({'success': False, 'message': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not admin.check_password(password):
        return Response({'success': False, 'message': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Invalidate old OTPs
    OTP.objects.filter(admin=admin, consumed=False).update(consumed=True)

    code = generate_otp_code()
    expires_minutes = settings.OTP_EXPIRES_MINUTES
    expires_at = timezone.now() + datetime.timedelta(minutes=expires_minutes)
    OTP.objects.create(admin=admin, code=code, expires_at=expires_at)

    email_sent = send_otp_email(admin, code, expires_minutes)

    # Always echo the OTP to the server console too, as a dev-friendly fallback
    # in case SMTP isn't configured yet (mirrors the previous Node behaviour).
    print(f"\n🔑  DEV OTP for {email}: {code}\n")

    message = (
        f'OTP sent to {email}. Valid for {expires_minutes} minutes.'
        if email_sent else
        f'Could not email the OTP (check EMAIL_* settings in .env). '
        f'For now, find it printed in the Django server console. Valid for {expires_minutes} minutes.'
    )

    return Response({
        'success': True,
        'message': message,
        'emailSent': email_sent,
        'adminId': str(admin.id)
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def verify_otp(request):
    admin_id = request.data.get('adminId')
    code = request.data.get('code')

    try:
        otp = OTP.objects.filter(admin_id=admin_id, code=code, consumed=False).latest('created_at')
    except OTP.DoesNotExist:
        return Response({'success': False, 'message': 'Invalid OTP code.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not otp.is_valid():
        return Response({'success': False, 'message': 'OTP has expired or already been used.'}, status=status.HTTP_401_UNAUTHORIZED)

    otp.consumed = True
    otp.save()

    admin = otp.admin
    if not admin.is_verified:
        admin.is_verified = True
        admin.save()

    # Generate a real signed JWT (replaces the previous jsonwebtoken-issued token)
    token = generate_token(admin)

    return Response({
        'success': True,
        'message': 'Login successful.',
        'token': token,
        'admin': {'id': str(admin.id), 'name': admin.name, 'email': admin.email}
    })


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def me(request):
    try:
        admin = Admin.objects.get(pk=request.user.id)
        return Response({'success': True, 'admin': AdminSerializer(admin).data})
    except Admin.DoesNotExist:
        return Response({'success': False, 'message': 'Admin not found.'}, status=404)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)


# ─── Dashboard Views ──────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    total_customers = Customer.objects.count()
    total_collection = Payment.objects.aggregate(total=Sum('amount'))['total'] or 0
    
    totals = Customer.objects.aggregate(
        total_amt=Sum('amount_total'),
        paid_amt=Sum('amount_paid')
    )
    tot_amt = float(totals['total_amt'] or 0)
    paid_amt = float(totals['paid_amt'] or 0)
    pending_collection = f"{(tot_amt - paid_amt):.2f}"

    return Response({
        'success': True,
        'data': {
            'totalCustomers': total_customers,
            'totalCollection': f"{float(total_collection):.2f}",
            'pendingCollection': pending_collection,
        }
    })


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def dashboard_monthly_collection(request):
    # Group payments by month for past 12 months
    today = datetime.date.today()
    monthly_data = []

    for i in range(11, -1, -1):
        # Calculate year and month for 12 months back
        year = today.year - ((today.month - 1 - i) // 12 if (today.month - 1 - i) < 0 else 0)
        month = (today.month - 1 - i) % 12 + 1
        
        month_label = datetime.date(year, month, 1).strftime('%b %Y')
        total = Payment.objects.filter(payment_date__year=year, payment_date__month=month).aggregate(t=Sum('amount'))['t'] or 0

        monthly_data.append({
            'month': month_label,
            'total': float(total)
        })

    return Response({'success': True, 'data': monthly_data})


# ─── Customer Views ───────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def customer_list_create(request):
    if request.method == 'GET':
        category = request.query_params.get('category')
        search = request.query_params.get('search')

        qs = Customer.objects.all().order_by('-created_at')
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(contact_number__icontains=search) | Q(vehicle_number__icontains=search))

        serializer = CustomerSerializer(qs, many=True)
        return Response({'success': True, 'total': qs.count(), 'data': serializer.data})

    elif request.method == 'POST':
        serializer = CustomerSerializer(data=request.data)
        if serializer.is_valid():
            customer = serializer.save()
            return Response({'success': True, 'message': 'Customer created.', 'data': CustomerSerializer(customer).data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'message': 'Validation failed.', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def customer_detail(request, pk):
    try:
        customer = Customer.objects.get(pk=pk)
    except Customer.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found.'}, status=404)

    if request.method == 'GET':
        return Response({'success': True, 'data': CustomerSerializer(customer).data})

    elif request.method == 'PUT':
        serializer = CustomerSerializer(customer, data=request.data, partial=True)
        if serializer.is_valid():
            customer = serializer.save()
            return Response({'success': True, 'message': 'Customer updated.', 'data': CustomerSerializer(customer).data})
        return Response({'success': False, 'errors': serializer.errors}, status=400)

    elif request.method == 'DELETE':
        customer.delete()
        return Response({'success': True, 'message': 'Customer deleted.'})


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def send_reminder(request, pk):
    try:
        customer = Customer.objects.get(pk=pk)
    except Customer.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found.'}, status=404)

    log = send_whatsapp_stub(customer)
    return Response({
        'success': True,
        'message': f'Reminder sent via stub to {customer.contact_number}.',
        'data': MessageLogSerializer(log).data
    })


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def expiring_soon(request):
    days = int(request.query_params.get('days', 30))
    category = request.query_params.get('category')

    today = datetime.date.today()
    future = today + datetime.timedelta(days=days)

    qs = Customer.objects.filter(end_date__range=[today, future])
    if category:
        qs = qs.filter(category=category)

    serializer = CustomerSerializer(qs, many=True)
    return Response({'success': True, 'days': days, 'total': qs.count(), 'data': serializer.data})


# ─── Payment & Receipt Views ──────────────────────────────────────────────────

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def record_payment(request):
    customer_id = request.data.get('customer_id')
    amount = request.data.get('amount')
    payment_date = request.data.get('payment_date', datetime.date.today())
    method = request.data.get('method')

    try:
        customer = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found.'}, status=404)

    receipt_number = f"REC-{int(timezone.now().timestamp() * 1000)}"
    payment = Payment.objects.create(
        customer=customer,
        amount=amount,
        payment_date=payment_date,
        method=method,
        receipt_number=receipt_number
    )

    # Recalculate customer amount_paid
    total_paid = Payment.objects.filter(customer=customer).aggregate(t=Sum('amount'))['t'] or 0
    customer.amount_paid = total_paid
    customer.save()

    return Response({
        'success': True,
        'message': 'Payment recorded.',
        'data': PaymentSerializer(payment).data,
        'amount_pending': customer.amount_pending
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def overall_receipts(request):
    customers = Customer.objects.all()
    rows = []
    grand_total = 0
    grand_paid = 0
    grand_pending = 0

    for c in customers:
        tot = float(c.amount_total or 0)
        paid = float(c.amount_paid or 0)
        pending = tot - paid

        grand_total += tot
        grand_paid += paid
        grand_pending += pending

        rows.append({
            'id': str(c.id),
            'name': c.name,
            'contact_number': c.contact_number,
            'category': c.category,
            'vehicle_number': c.vehicle_number,
            'amount_total': tot,
            'amount_paid': paid,
            'amount_pending': pending,
        })

    return Response({
        'success': True,
        'data': {
            'summary': {
                'grandTotal': grand_total,
                'grandPaid': grand_paid,
                'grandPending': grand_pending,
            },
            'customers': rows
        }
    })


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_receipt(request, customer_id):
    try:
        customer = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found.'}, status=404)

    payments = customer.payments.all().order_by('-payment_date')
    paid = sum(float(p.amount) for p in payments)
    pending = float(customer.amount_total or 0) - paid

    return Response({
        'success': True,
        'data': {
            'customer': CustomerSerializer(customer).data,
            'payments': PaymentSerializer(payments, many=True).data,
            'totalPaid': f"{paid:.2f}",
            'totalPending': f"{pending:.2f}",
        }
    })


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_receipt_pdf(request, customer_id):
    try:
        customer = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found.'}, status=404)

    payments = list(customer.payments.all().order_by('-payment_date'))
    paid = sum(float(p.amount) for p in payments)
    pending = float(customer.amount_total or 0) - paid

    admin_name = getattr(request.user, 'name', None) or 'Bhavesh Solanki'
    pdf_bytes = generate_pdf_receipt(customer, payments, paid, pending, admin_name=admin_name)

    filename = f"receipt_{customer.name.replace(' ', '_')}.pdf"
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
