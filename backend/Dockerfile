# Python için resmi temel imajı kullan
FROM python:3.11-slim-buster

# Eski Debian depoları için archive.debian.org'u kullan
RUN sed -i -e 's/deb.debian.org/archive.debian.org/g' \
           -e 's/security.debian.org/archive.debian.org/g' \
           /etc/apt/sources.list
RUN sed -i -e '/stretch-updates/d' /etc/apt/sources.list

# PostgreSQL istemci araçlarını yükle
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Çalışma dizinini ayarla
WORKDIR /app

# Bağımlılıkları kopyala ve kur
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodunu kopyala
COPY . .

# FastAPI uygulamasını Uvicorn ile çalıştırmak için komut
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 