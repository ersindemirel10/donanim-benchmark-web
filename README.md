# PC Donanım, Termal Analiz ve Benchmark Veritabanı

Web Tabanlı Teknolojiler dersi dönem sonu projesi.

Kullanıcılar PC/laptop sistemlerini ve donanım parçalarını kaydedip, farklı ayar profilleriyle (undervolt, güç limiti, fan) yaptıkları benchmark sonuçlarını ve sıcaklık değerlerini karşılaştırabiliyor. Amaç, hangi ayarın hangi sistemde daha iyi performans/sıcaklık verdiğini görmek ve termal darboğaza (throttling) giren testleri otomatik işaretlemek.

## Teknolojiler

- **Backend:** Python, Django, Django REST Framework
- **Kimlik doğrulama:** JWT (djangorestframework-simplejwt)
- **API dokümantasyonu:** Swagger (drf-spectacular)
- **Veritabanı:** SQLite
- **Frontend:** React (Vite), react-router-dom, düz `fetch`

## Klasör yapısı

```
donanim-benchmark-web/
├── backend/
│   ├── config/          # Django proje ayarları ve ana URL'ler
│   ├── benchmark/       # Uygulama: modeller, serializer, view, URL, izinler
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api.js       # Backend istekleri, token ekleme ve yenileme, hata mesajları
│       ├── auth/        # Oturum yönetimi ve korumalı sayfa
│       └── pages/       # Sayfalar (giriş, parçalar, sistemler, profiller, testler, kıyas)
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

### Frontend

Backend açıkken ayrı bir terminalde (Node.js gerekli):

```powershell
cd frontend
npm install
npm run dev
```

Arayüz: http://localhost:5173

Backend CORS ayarı sadece `localhost:5173` ve `127.0.0.1:5173` için açık, o yüzden frontend bu portta çalışmalı. Backend adresi varsayılan olarak `http://127.0.0.1:8000/api`; değiştirmek için `frontend/.env` dosyasına `VITE_API_URL=...` yazılabilir.

**Arayüzde yapılanlar**
- Kayıt, giriş, çıkış. Token'lar tarayıcıda (`localStorage`) saklanır, sayfa yenilenince oturum devam eder. Access token (10 dk) dolunca refresh token ile otomatik yenilenir; o da geçersizse oturum kapanır.
- Parçalar: herkes görebilir, giriş yapan ekleyebilir, düzenle/sil sadece parçayı ekleyen kullanıcıya görünür.
- Parça formu türe göre değişir: örneğin RAM için çekirdek/TDP/sıcaklık sorulmaz, bellek türü (DDR4/DDR5), hız, bellek ve CL sorulur. RAM'in model adı bu özelliklerden otomatik oluşturulur (örn. `DDR5-6000 CL30 16GB`).
- Sistemler: liste, ekleme (parça seçerek), detay, düzenleme, silme.
- Sistem detayında sekmeler: Genel, Profiller, Testler, Kıyas.
- Testlerde throttle olanlar kırmızı işaretlenir ve sebebi gösterilir. Test sonucunda sadece not düzenlenebilir.
- API'nin döndürdüğü hata mesajları (400, 401, 403, 404, 409) ve başarı mesajları ekranda gösterilir.

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
| GET | `/auth/me/` | Giriş yapan kullanıcının id, kullanıcı adı, e-postası | Evet |

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

Dönen durum kodları: `200`, `201`, `204`, `400` (doğrulama hatası), `401` (giriş yok / token geçersiz), `403` (başkasının kaydı), `404`, `409` (kullanıcı adı/e-posta zaten var, ya da silinmek istenen parça bir sistemde kullanılıyor).

## İş kuralları

- **Termal darboğaz tespiti** (`benchmark/services.py`): Test sonucu eklenirken ölçülen en yüksek CPU/GPU sıcaklığı, sistemdeki parçanın `max_temp_c` sınırına ulaştıysa `throttled` ve `throttle_reason` alanlarını backend doldurur. Kullanıcı bu alanları gönderse de dikkate alınmaz.
- **Profil kıyaslama** (`/builds/{id}/compare/`): Her profil için test sayısı, ortalama skor, en yüksek sıcaklıklar ve throttle sayısı. En yüksek ortalama skor üstte.
- **Doğrulama:** Undervolt -250 ile 0 mV arasında, güç limiti 0'dan büyük olmalı. Test sonucuna seçilen profil aynı sisteme ait olmalı.
- **Değer sınırları:** Mantıksız değerler reddedilir. Örneğin parçada `max_temp_c` en fazla 150, `tdp_w` en fazla 2000; RAM için CAS gecikmesi (`cas_latency`) 9 ile 70 arası ve bellek türü (`memory_type`) DDR4 veya DDR5; test sonucunda sıcaklıklar en fazla 150, ortam sıcaklığı -50 ile 60 arası, skor 0 veya büyük.
- **Silme:** Bir sistemde kullanılan parça silinemez (`409`). Sistem silinirse profilleri ve test sonuçları da silinir. Profil silinirse testleri kalır, profilsiz görünür.
- **Sahiplik:** Parçayı sadece ekleyen, sistemi/profili/test sonucunu sadece sistemin sahibi değiştirebilir.

## Durum

Backend ve React arayüzü tamamlandı. Ödevdeki tüm özellikler (kayıt/giriş, yetkilendirme, 5 varlık için CRUD, hata/başarı mesajları, oturum yönetimi) arayüzden de kullanılabiliyor.
