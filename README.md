# S.I.F.U — Simulador de fulbo Definitivo 2025

Proyecto Angular (standalone components) para simular temporadas, gestionar equipos, usuarios y partidas guardadas.

## Resumen
Aplicación cliente que consume un backend JSON (json-server) en `http://localhost:3000`. Soporta registro/login de usuarios, selección de equipos y gestión de partidas guardadas.

## Archivos clave
- Aplicación bootstrap: [`bootstrapApplication`](src/main.ts) en [src/main.ts](src/main.ts) y componente raíz [`App`](src/app/app.ts) en [src/app/app.ts](src/app/app.ts).

- Configuración de providers: [`appConfig`](src/app/app.config.ts) — [src/app/app.config.ts](src/app/app.config.ts)
- Ruteo: variable [`routes`](src/app/app.routes.ts) — [src/app/app.routes.ts](src/app/app.routes.ts)

- Autenticación: clase [`AuthService`](src/app/auth/auth-service.ts) — [src/app/auth/auth-service.ts](src/app/auth/auth-service.ts) y guardia [`AuthGuard`](src/app/guards/auth-guard.ts) — [src/app/guards/auth-guard.ts](src/app/guards/auth-guard.ts)

- Componentes de auth:
  - [`LoginComponent`](src/app/auth/login/login.component.ts) — [src/app/auth/login/login.component.ts](src/app/auth/login/login.component.ts)
  - [`RegisterComponent`](src/app/auth/register/register.component.ts) — [src/app/auth/register/register.component.ts](src/app/auth/register/register.component.ts)

- Equipos:
  - Servicio [`TeamsService`](src/app/equipos/teams-service.ts) — [src/app/equipos/teams-service.ts](src/app/equipos/teams-service.ts)
  - [`TeamsSelectionComponent`](src/app/equipos/teams-selection-component/teams-selection-component.ts) — [src/app/equipos/teams-selection-component/teams-selection-component.ts](src/app/equipos/teams-selection-component/teams-selection-component.ts)
  - [`PlantelComponent`](src/app/equipos/plantel-component/plantel-component.ts) — [src/app/equipos/plantel-component/plantel-component.ts](src/app/equipos/plantel-component/plantel-component.ts)

- Modelos importantes:
  - [`Users`](src/app/models/users.ts) — [src/app/models/users.ts](src/app/models/users.ts)
  - [`Teams`](src/app/models/teams.ts) — [src/app/models/teams.ts](src/app/models/teams.ts)
  - [`Player`](src/app/models/player.ts) — [src/app/models/player.ts](src/app/models/player.ts)
  - [`Match`](src/app/models/match.ts) — [src/app/models/match.ts](src/app/models/match.ts)
  - [`Saves`](src/app/models/saves.ts) — [src/app/models/saves.ts](src/app/models/saves.ts)

- Base de datos de desarrollo (json-server): [database/db.json](database/db.json)

## Requisitos
- Node.js (v16+ recomendado)
- npm
- json-server (para backend de desarrollo)

## Instalación y ejecución (desarrollo)
1. Instalar dependencias:
npm install

2. Levantar mock-API (desde la raíz del repo):
npx json-server --watch db.json 

3. Levantar la app Angular:
ng serve --open

La app espera la API en http://localhost:3000 (ver AuthService y TeamsService).

Flujo principal
Registro: RegisterComponent usa AuthService.register.
Login: LoginComponent usa AuthService.login.
Rutas protegidas: AuthGuard protege rutas como menu (definidas en routes).
Selección de equipos y plantel: TeamsSelectionComponent y PlantelComponent consumen TeamsService.

Estructura rápida
src/app — código de la app (rutas, auth, equipos, menú, guards, modelos)
database/db.json — datos iniciales para json-server
src/main.ts — arranque de la app
src/index.html — template HTML

Notas
Validaciones de usuario y manejo de estado se hacen en AuthService y componentes de auth.
Para pruebas locales, editar database/db.json según necesidad.