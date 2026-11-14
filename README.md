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

Hepsinin başında `/api` var. Tam liste ve canlı deneme için Swagger sayfasına bakın.

**Auth**
| Metot | Adres | Açıklama | Giriş |
|-------|-------|----------|-------|
| POST | `/auth/register/` | Kayıt | Hayır |
| POST | `/auth/login/` | Giriş, JWT token verir | Hayır |
| POST | `/auth/refresh/` | Access token yeniler | Hayır |

**Parçalar** (herkese açık katalog, değiştirme/silme sadece ekleyen kullanıcı)
| Metot | Adres | Giriş |
|-------|-------|-------|
| GET, POST | `/components/` | GET hayır, POST evet |
| GET, PUT, PATCH, DELETE | `/components/{id}/` | GET hayır, diğerleri evet |

**Sistemler** (kişisel, sadece sahibi görür ve değiştirir)
| Metot | Adres | Açıklama |
|-------|-------|----------|
| GET, POST | `/builds/` | Kendi sistemlerini listele / ekle |
| GET, PUT, PATCH, DELETE | `/builds/{id}/` | Tek sistem |
| GET | `/builds/{id}/compare/` | Ayar profillerini kıyasla |

**Ayar profilleri ve test sonuçları** (sistemin sahibine açık)
| Metot | Adres | Açıklama |
|-------|-------|----------|
| GET, POST | `/builds/{id}/profiles/` | Sistemin profillerini listele / ekle |
| GET, PUT, PATCH, DELETE | `/profiles/{id}/` | Tek profil |
| GET, POST | `/builds/{id}/runs/` | Sistemin test sonuçlarını listele / ekle |
| GET, PUT, PATCH, DELETE | `/runs/{id}/` | Tek test sonucu (güncellemede sadece `notes`) |

Korumalı endpoint'leri Swagger'da denemek için `login` cevabındaki `access` token'ı sağ üstteki **Authorize** butonuna yapıştır (başına `Bearer` yazma). Access token 10 dakika geçerli.

Dönen durum kodları: `200`, `201`, `204`, `400` (doğrulama hatası), `401` (giriş yok / token geçersiz), `403` (başkasının kaydı), `404`, `409` (kullanıcı adı/e-posta zaten var).

## İş kuralları

- **Termal darboğaz tespiti** (`benchmark/services.py`): Test sonucu eklenirken ölçülen en yüksek CPU/GPU sıcaklığı, sistemdeki parçanın `max_temp_c` sınırına ulaştıysa `throttled` ve `throttle_reason` alanlarını backend doldurur. Kullanıcı bu alanları gönderse de dikkate alınmaz.
- **Profil kıyaslama** (`/builds/{id}/compare/`): Her profil için test sayısı, ortalama skor, en yüksek sıcaklıklar ve throttle sayısı. En yüksek ortalama skor üstte.
- **Doğrulama:** Undervolt -250 ile 0 mV arasında, güç limiti 0'dan büyük olmalı. Test sonucuna seçilen profil aynı sisteme ait olmalı.
- **Sahiplik:** Parçayı sadece ekleyen, sistemi/profili/test sonucunu sadece sistemin sahibi değiştirebilir.

## Durum

**Yapıldı**
- Proje iskeleti, veritabanı modelleri ve migration'lar
- Kayıt, giriş ve JWT kimlik doğrulama
- Swagger entegrasyonu
- Parça, sistem, ayar profili ve test sonucu için CRUD ve sahiplik kontrolleri
- Termal darboğaz tespiti ve profil kıyaslama
- React için CORS ayarı

**Yapılacak**
- React arayüzü
