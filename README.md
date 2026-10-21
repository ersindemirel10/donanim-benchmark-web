# PC Donanım, Termal Analiz ve Benchmark Veritabanı

Web Tabanlı Teknolojiler dersi dönem sonu projesi.

Kullanıcılar PC/laptop sistemlerini ve donanım parçalarını kaydedip, farklı ayar profilleriyle (undervolt, güç limiti, fan) yaptıkları benchmark sonuçlarını ve sıcaklık değerlerini karşılaştırabiliyor. Amaç, hangi ayarın hangi sistemde daha iyi performans/sıcaklık verdiğini görmek ve termal darboğaza (throttling) giren testleri otomatik işaretlemek.

## Teknolojiler

- **Backend:** Python, Django, Django REST Framework
- **Kimlik doğrulama:** JWT (djangorestframework-simplejwt)
- **API dokümantasyonu:** Swagger (drf-spectacular)
- **Veritabanı:** SQLite
- **Frontend:** React (henüz başlanmadı)

## Klasör yapısı

```
donanim-benchmark-web/
├── backend/
│   ├── config/          # Django proje ayarları ve ana URL'ler
│   ├── benchmark/       # Uygulama: modeller, serializer, view, URL, izinler
│   ├── manage.py
│   └── requirements.txt
├── frontend/            # React uygulaması (sonra)
└── README.md
```

## Kurulum ve çalıştırma (Windows)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Sunucu açılınca Swagger sayfası: http://127.0.0.1:8000/api/docs/

Not: `activate` komutundan sonra satırın başında `(venv)` yazmalı.

## Veri modelleri

| Model | Açıklama |
|-------|----------|
| User | Django'nun hazır kullanıcı modeli |
| Component | Donanım parçası (CPU / GPU / RAM) |
| SystemBuild | Kullanıcının sistemi (laptop / masaüstü), parçalarla çoka-çok ilişkili |
| TuningProfile | Sisteme ait ayar profili (undervolt, güç limiti, fan) |
| BenchmarkRun | Test sonucu (skor, sıcaklıklar, saat hızları) |

## Endpoint'ler

| Metot | Adres | Açıklama | Giriş gerekir mi? |
|-------|-------|----------|-------------------|
| POST | `/api/auth/register/` | Kayıt | Hayır |
| POST | `/api/auth/login/` | Giriş, JWT token verir | Hayır |
| POST | `/api/auth/refresh/` | Access token yeniler | Hayır |
| GET | `/api/components/` | Parçaları listeler | Hayır |
| POST | `/api/components/` | Parça ekler | Evet |
| GET | `/api/components/{id}/` | Tek parça | Hayır |
| PUT / PATCH | `/api/components/{id}/` | Parça günceller (sadece ekleyen) | Evet |
| DELETE | `/api/components/{id}/` | Parça siler (sadece ekleyen) | Evet |

Korumalı endpoint'leri Swagger'da denemek için `login` cevabındaki `access` token'ı sağ üstteki **Authorize** butonuna yapıştır (başına `Bearer` yazma). Access token 5 dakika geçerli.

Dönen durum kodları: `200`, `201`, `204`, `400` (doğrulama hatası), `401` (giriş yok), `403` (başkasının kaydı), `404`, `409` (kullanıcı adı/e-posta zaten var).

## Durum

**Yapıldı**
- Proje iskeleti, veritabanı modelleri ve migration'lar
- Kayıt, giriş ve JWT kimlik doğrulama
- Swagger entegrasyonu
- Parça (Component) için CRUD ve sahiplik kontrolü

**Yapılacak**
- Sistem, ayar profili ve test sonucu endpoint'leri
- Termal darboğaz tespiti (sıcaklık parçanın sınırına ulaştıysa test otomatik işaretlenecek)
- Profilleri kıyaslama endpoint'i
- React arayüzü
