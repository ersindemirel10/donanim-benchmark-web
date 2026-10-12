# PC Donanım, Termal Analiz ve Benchmark Veritabanı

Web Tabanlı Teknolojiler dönem sonu projesi.

## Teknolojiler
| Katman | Teknoloji |
|--------|-----------|
| Backend | Python + Django + Django REST Framework |
| Kimlik doğrulama | JWT (djangorestframework-simplejwt) |
| Veritabanı | SQLite |
| Frontend | React |

## Klasör Yapısı
```
donanim-benchmark-web/
├── backend/            # Django projesi (REST API)
│   └── requirements.txt
├── frontend/           # React uygulaması
├── .gitignore
└── README.md
```

## Backend kurulumu (Windows)
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
