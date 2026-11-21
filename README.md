# Room Booking API

API do rezerwacji sal w Express, z PostgreSQL i dokumentacją Swagger UI.

## Uruchomienie w Docker Compose

Zainstaluj i uruchom Docker Desktop lub Docker Engine z wtyczką Docker Compose. W adresie poniżej podstaw adres swojego repozytorium GitHub. Komendy są zapisane dla PowerShell.

```powershell
git clone https://github.com/Holingo/RoomBookingAPI.git
cd RoomBookingAPI
Copy-Item .env.example .env
docker compose up --build
```

W Bash użyj `cp .env.example .env`. Przy pierwszym starcie Compose uruchamia PostgreSQL, czeka na status `healthy`, a kontener API wykonuje migracje Knex i uruchamia serwer. Swagger UI otworzysz pod adresem [localhost:3001/api/docs/](http://localhost:3001/api/docs/).

`.env.example` zawiera dane przykładowe do uruchomienia lokalnego. Jeżeli masz już swój plik `.env`, uzupełnij go o brakujące zmienne z szablonu i dopasuj `DOCKER_DATABASE_URL` do danych PostgreSQL. W adresie dla kontenera hostem jest `db`, a portem `5432`. `DATABASE_URL` jest używany przy uruchamianiu aplikacji bezpośrednio na hoście. Port, pod którym Compose udostępnia API na komputerze, ustawia `API_PORT`.

## Dane demonstracyjne i stan usług

W drugim terminalu, w katalogu repozytorium, uruchom:

```powershell
docker compose ps
docker compose logs api
docker compose exec api npx knex seed:run
```

Seed tworzy konto administratora z `ADMIN_EMAIL` i `ADMIN_PASSWORD` z pliku `.env`. Na świeżej bazie dodaje też przykładowe budynki, sale i rezerwacje. Zaloguj się przez `POST /api/auth/login`.

## Zatrzymanie

```powershell
docker compose down
```

API obsługuje `SIGTERM` i zamyka serwer HTTP oraz pulę połączeń PostgreSQL. Dane PostgreSQL przechowuje nazwany wolumen `pgdata`.
