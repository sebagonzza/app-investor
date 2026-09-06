# Gestor de Inversiones — MVP

Aplicación web para gestionar inversiones propias y de terceros, con Postgres/Supabase como
fuente de verdad y exportación de solo lectura a Google Sheets.

## Por qué Postgres y no Google Sheets como fuente de verdad

Durante el análisis de los Sheets originales (uno por cliente) se detectaron inconsistencias que
hacen riesgoso usarlos como fuente de datos en vivo:

- Rangos de fórmulas `SUM` extendidos a mano por fila, distintos entre archivos.
- Constantes de capital "quemadas" dentro de fórmulas en vez de referenciadas.
- Vocabulario de estado (`STATE`) inconsistente entre clientes (`CANCEL` usado para transferencias
  en un archivo, ausente en el otro).
- Estructura del bloque de cierre/comisión distinta entre clientes.

Por eso: **Postgres es la fuente de verdad**, los Sheets originales quedan como archivo histórico
de origen (se leen una sola vez en la migración) y la web puede **exportar** reportes de solo
lectura a Sheets nuevos, con valores planos, sin fórmulas frágiles.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres) · Recharts ·
react-hook-form + zod · googleapis (export a Sheets)

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear proyecto en Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En el SQL Editor, corré el contenido de `supabase/schema.sql` completo.
3. En **Authentication → Providers**, dejá habilitado Email/Password.
4. Creá tu primer usuario admin:
   - Andá a **Authentication → Users → Add user** (con email/password).
   - En el SQL Editor, insertá su perfil como ADMIN:
     ```sql
     insert into public.profiles (id, full_name, role)
     values ('UUID_DEL_USUARIO', 'Tu nombre', 'ADMIN');
     ```
     (el UUID lo ves en la tabla de usuarios de Authentication).

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completá `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
desde **Project Settings → API** en Supabase.

### 4. Migración inicial desde los Sheets existentes

```bash
npm run migrate:xlsx -- "Peon Bruno=./MOVIMIENTOS_PEON_BRUNO.xlsx" "Melano Agustina=./MOVIMIENTOS_MELANO_AGUSTINA.xlsx"
```

Esto genera `migration-output/`:

- `operations.json`: operaciones normalizadas, listas para revisar.
- `revisar_manualmente.json`: filas ambiguas (transferencias, cierres agregados) que necesitan
  tu criterio antes de cargarlas.
- `seed.sql`: INSERTs generados — **revisalos antes de correrlos**. Necesitan que los clientes
  ("Peon Bruno", "Melano Agustina") ya existan en la tabla `clients`:

  ```sql
  insert into public.clients (name, type) values ('Peon Bruno', 'TERCERO');
  insert into public.clients (name, type) values ('Melano Agustina', 'TERCERO');
  ```

  Después corré `migration-output/seed.sql` en el SQL Editor de Supabase.

### 5. Google Sheets (opcional para el MVP, solo para exportar reportes)

1. Creá un Service Account en Google Cloud Console con acceso a Sheets API y Drive API.
2. Descargá la clave JSON y completá `GOOGLE_SERVICE_ACCOUNT_EMAIL` y
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` en `.env.local` (la key con los `\n` literales, tal como
   viene en el JSON).

### 6. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) e iniciá sesión con el usuario admin creado
en el paso 2.

## Estructura del proyecto

```
src/
  app/
    login/                    Login
    (app)/                    Rutas protegidas (requieren sesión)
      dashboard/
      clientes/[id]/
      carteras/
      inversiones/
      operaciones/
      movimientos/
      rendimientos/
      reportes/
      configuracion/
    api/
      operations/              CRUD de operaciones (con validación + regla no-vender-de-más)
      clients/
      assets/
      reports/export-sheets/   Exporta un cliente a una Google Sheet de salida
  lib/
    supabase/                  Clientes browser / server / admin
    sheets/                    Capa de exportación a Google Sheets (solo backend)
    validations/               Esquemas zod (operación, cliente)
    auth/                      Helpers de roles
  components/
    layout/                    Sidebar, Topbar
    dashboard/                 KPIs y gráficos (Recharts)
    operaciones/                Formulario, acciones de fila, botón de exportación
supabase/
  schema.sql                   Tablas, vistas calculadas, triggers, RLS
scripts/
  migrate-xlsx.ts               Migración inicial desde los Sheets por cliente
```

## Roles

- **VIEWER**: solo lectura en toda la app.
- **MANAGER**: puede crear/editar clientes y operaciones.
- **ADMIN**: además puede eliminar operaciones y gestionar usuarios/roles (por ahora, editando
  directamente la tabla `profiles` en Supabase — un panel de edición queda fuera del MVP).

## Qué queda fuera del MVP (a propósito)

- Precios de mercado en vivo (la tabla `price_snapshots` y el modelo de `assets` ya están
  preparados para conectar una API después).
- Edición de roles desde la UI.
- Sincronización automática/programada a Sheets (por ahora es manual, botón "Exportar").
- Multi-moneda con conversión automática (se guarda la moneda por operación, pero el dashboard
  asume ARS para los totales agregados).

## Próximos pasos sugeridos

1. Revisar y decidir cómo tratar las filas de `revisar_manualmente.json` (transferencias/canjes,
   cierres con comisión agregada) antes de cargarlas.
2. Sumar más clientes al proceso de migración a medida que los vayas exportando como XLSX.
3. Definir qué API de precios de mercado usar (para completar "Precio actual" en Inversiones).
