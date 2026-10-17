import csv
from datetime import date
from decimal import Decimal, InvalidOperation
from io import StringIO

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.marketplace.models import Listing, Transaction
from .models import Commodity, Market, MarketPrice
from .serializers import CommoditySerializer

User = get_user_model()
MAX_CSV_BYTES = 5 * 1024 * 1024
MAX_CSV_ROWS = 5000
REQUIRED_CSV_COLUMNS = {'market', 'commodity', 'price_per_unit', 'recorded_date'}


class AdministratorPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class AdminCommoditySerializer(CommoditySerializer):
    class Meta(CommoditySerializer.Meta):
        fields = [
            'id',
            'name',
            'local_names',
            'category',
            'unit',
            'image',
            'is_active',
        ]
        read_only_fields = ['id']


class AdminCommodityListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminCommoditySerializer
    permission_classes = [permissions.IsAuthenticated, AdministratorPermission]
    pagination_class = None

    def get_queryset(self):
        return Commodity.objects.all()


class AdminCommodityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminCommoditySerializer
    permission_classes = [permissions.IsAuthenticated, AdministratorPermission]
    queryset = Commodity.objects.all()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, AdministratorPermission])
def admin_dashboard(request):
    transaction_summary = Transaction.objects.filter(
        status=Transaction.Status.COMPLETED,
    ).aggregate(total_value=Sum('total_amount'))
    return Response({
        'total_users': User.objects.count(),
        'total_listings': Listing.objects.count(),
        'active_listings': Listing.objects.filter(
            status=Listing.Status.ACTIVE,
        ).count(),
        'completed_transactions': Transaction.objects.filter(
            status=Transaction.Status.COMPLETED,
        ).count(),
        'completed_transaction_value_ugx': str(
            transaction_summary['total_value'] or Decimal('0.00')
        ),
        'market_price_reports': MarketPrice.objects.count(),
        'active_commodities': Commodity.objects.filter(is_active=True).count(),
    })


def _parse_price_csv(uploaded_file):
    if uploaded_file.size > MAX_CSV_BYTES:
        return None, [{'row': 0, 'error': 'CSV file must be 5 MB or smaller.'}]
    try:
        text = uploaded_file.read().decode('utf-8-sig')
    except UnicodeDecodeError:
        return None, [{'row': 0, 'error': 'CSV must use UTF-8 encoding.'}]

    reader = csv.DictReader(StringIO(text))
    if not reader.fieldnames:
        return None, [{'row': 1, 'error': 'CSV must include a header row.'}]
    normalized_headers = [header.strip().lower() for header in reader.fieldnames]
    if len(normalized_headers) != len(set(normalized_headers)):
        return None, [{'row': 1, 'error': 'CSV contains duplicate column names.'}]
    missing = REQUIRED_CSV_COLUMNS - set(normalized_headers)
    if missing:
        return None, [{
            'row': 1,
            'error': f"Missing required columns: {', '.join(sorted(missing))}.",
        }]
    reader.fieldnames = normalized_headers

    market_rows = list(
        Market.objects.filter(is_active=True).select_related('district')
    )
    markets_by_name = {}
    for market in market_rows:
        markets_by_name.setdefault(market.name.casefold(), []).append(market)
    commodities_by_name = {
        commodity.name.casefold(): commodity
        for commodity in Commodity.objects.filter(is_active=True)
    }
    parsed_rows = []
    errors = []
    seen_keys = set()
    for row_number, row in enumerate(reader, start=2):
        if row_number > MAX_CSV_ROWS + 1:
            errors.append({
                'row': row_number,
                'error': f'CSV cannot contain more than {MAX_CSV_ROWS} data rows.',
            })
            break
        if not row or not any((value or '').strip() for value in row.values()):
            continue

        values = {
            key: (value or '').strip()
            for key, value in row.items()
            if key is not None
        }
        try:
            market_options = markets_by_name.get(values.get('market', '').casefold(), [])
            if len(market_options) != 1:
                raise ValueError(
                    'Market must match exactly one active market name.'
                )
            commodity = commodities_by_name.get(
                values.get('commodity', '').casefold()
            )
            if not commodity:
                raise ValueError('Commodity must match an active commodity name.')
            price = Decimal(values.get('price_per_unit', ''))
            if not price.is_finite() or price <= 0:
                raise ValueError('Price must be a positive number.')
            recorded_date = date.fromisoformat(values.get('recorded_date', ''))
            price_type = values.get('price_type', 'wholesale') or 'wholesale'
            valid_price_types = {
                choice[0] for choice in MarketPrice._meta.get_field('price_type').choices
            }
            if price_type not in valid_price_types:
                raise ValueError(
                    f'Price type must be one of: {", ".join(sorted(valid_price_types))}.'
                )
            key = (market_options[0].id, commodity.id, price_type, recorded_date)
            if key in seen_keys:
                raise ValueError('CSV contains a duplicate market, commodity, type, and date.')
            seen_keys.add(key)
            parsed_rows.append({
                'market': market_options[0],
                'commodity': commodity,
                'price_per_unit': price,
                'unit': values.get('unit') or commodity.unit,
                'price_type': price_type,
                'source': values.get('source', ''),
                'recorded_date': recorded_date,
            })
        except (InvalidOperation, TypeError, ValueError) as error:
            errors.append({'row': row_number, 'error': str(error)})

    return parsed_rows, errors


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, AdministratorPermission])
@parser_classes([MultiPartParser, FormParser])
def import_market_prices(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return Response(
            {'error': 'Upload a CSV file in the file field.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    parsed_rows, errors = _parse_price_csv(uploaded_file)
    if errors:
        return Response(
            {'error': 'No prices were imported because the CSV contains errors.', 'row_errors': errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not parsed_rows:
        return Response(
            {'error': 'The CSV does not contain any price records.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    created_count = 0
    updated_count = 0
    with transaction.atomic():
        for values in parsed_rows:
            _, created = MarketPrice.objects.update_or_create(
                market=values['market'],
                commodity=values['commodity'],
                price_type=values['price_type'],
                recorded_date=values['recorded_date'],
                defaults={
                    'price_per_unit': values['price_per_unit'],
                    'unit': values['unit'],
                    'source': values['source'],
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

    return Response(
        {
            'created': created_count,
            'updated': updated_count,
            'total_processed': len(parsed_rows),
        },
        status=status.HTTP_201_CREATED,
    )
