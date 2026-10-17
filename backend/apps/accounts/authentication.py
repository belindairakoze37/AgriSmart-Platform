from django.contrib.auth import get_user_model
from django.db.models import CharField, Q, Value
from django.db.models.functions import Concat

User = get_user_model()


def find_login_user(identifier):
    normalized = identifier.strip()
    if not normalized:
        return None
    matching_ids = list(
        User.objects.annotate(
            full_name=Concat(
                'first_name',
                Value(' '),
                'last_name',
                output_field=CharField(),
            ),
        )
        .filter(
            Q(phone_number__iexact=normalized)
            | Q(username__iexact=normalized)
            | Q(email__iexact=normalized)
            | Q(full_name__iexact=normalized)
        )
        .order_by()
        .values_list('pk', flat=True)[:2]
    )
    if len(matching_ids) != 1:
        return None
    return User.objects.filter(pk=matching_ids[0]).first()
