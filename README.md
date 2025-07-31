 
# Futbol İstatistik Dashboard ve Tahmin Modelleri

Bu proje, geçmiş futbol maç verilerini kullanarak kapsamlı bir istatistiksel gösterim panosu (dashboard) oluşturmayı ve lig bazlı tahmin modelleri geliştirerek bunları kullanıcı dostu bir "Forecast" sekmesinde sunmayı amaçlayan iki aşamalı bir uygulamadır.

## Kapsam ve Modüller

- **Veri Katmanı:** PostgreSQL veritabanı ile lig, takım, maç ve skor verilerinin yönetimi ve ETL boru hatları.
- **Backend API:** FastAPI ile takım ve lig istatistikleri için RESTful servisler.
- **Frontend Dashboard:** Next.js ve React kullanarak, Recharts/Chart.js ile zengin grafikler ve interaktif arayüz.
- **Tahmin Modelleri:** XGBoost, LightGBM, LSTM gibi modellerle lig bazlı skor/olasılık tahminleri.
- **Forecast Tab:** Frontend'de gelecek maçlar için tahminleri gösteren özel bir sayfa ve backend inference uç noktası.
- **DevOps & MLOps:** Docker/Docker Compose ile konteynerizasyon, GitHub Actions ile CI/CD ve MLflow/DVC ile model versiyonlama.

## Teknoloji ve Araç Seçimleri

- **Veritabanı:** PostgreSQL
- **Backend:** FastAPI
- **Frontend:** Next.js, React, Recharts/Chart.js
- **Modelleme:** scikit-learn, XGBoost, PyTorch
- **Konteynerizasyon:** Docker, docker-compose
- **CI/CD:** GitHub Actions
- **Model Versiyonlama:** MLflow veya DVC

## Yol Haritası (Özet)

1.  **Hazırlık & Planlama:** Gereksinimlerin belirlenmesi, sistem tasarımları, temel altyapı kurulumu.
2.  **Dashboard MVP:** Backend ve Frontend'in temel istatistik gösterimleriyle ilk sürümü.
3.  **İleri Dashboard Özellikleri:** Detaylı filtreler, veri indirme ve opsiyonel kimlik doğrulama.
4.  **Model Geliştirme & Eğitim:** Tahmin modellerinin oluşturulması ve eğitilmesi.
5.  **Forecast Tab Entegrasyonu:** Tahmin sonuçlarının arayüze entegrasyonu.
6.  **Üretim & İzleme:** Uygulamanın canlıya alınması ve performans izlemesi.

## Kurulum ve Çalıştırma

(Bu bölüm, kurulum adımları tamamlandığında güncellenecektir.) 