from rest_framework.views import exception_handler


def turkish_exception_handler(exc, context):
    """DRF'in varsayılan hata işleyicisi; sadece 404 mesajını Türkçeleştirir.

    get_object_or_404 / get_object() "No SystemBuild matches the given query."
    gibi İngilizce bir mesaj üretir, bu yüzden 404'lerde sabit bir Türkçe mesaj döneriz.
    """
    response = exception_handler(exc, context)
    if response is not None and response.status_code == 404:
        response.data = {'detail': 'Kayıt bulunamadı.'}
    return response
