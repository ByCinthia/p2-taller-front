# FrontendNew - Angular (Gestion de Usuario)

Migracion de la parte de gestion de usuario desde React a Angular, compatible con el backend FastAPI de backendnew.

## Alcance migrado

- Login y sesion con JWT.
- Carga de permisos del usuario (`/my-permissions/`).
- CRUD de empleados (`/empleados/`).
- CRUD de roles (`/roles/`).
- CRUD de permisos (`/permisos/`).
- Rutas protegidas para modulo `/app`.

## Estructura

- `src/app/core`: auth, interceptor, guard y servicios base.
- `src/app/features/auth/login`: login.
- `src/app/features/empleados`: modulo empleados.
- `src/app/features/roles`: modulo roles.
- `src/app/features/permisos`: modulo permisos.
- `src/app/layout`: shell principal con navegacion.

## Configuracion

Editar `src/environments/environment.ts`:

- `apiBaseUrl`: URL del backendnew (por defecto `http://localhost:8001`).

## Ejecutar

Desde `/frontend`:
npm install firebase
```bash
npm install
npm start
```

La app levanta por defecto en `http://localhost:4201`.

## Notas de compatibilidad

- El interceptor envia `Authorization: Bearer <token>` en todas las requests.
- Login espera el contrato de backendnew:
  - `POST /token/` -> `{ access, refresh }`
- Empleados usa `FormData` para soportar `foto_perfil`.
- Control de UI por permisos:
  - Empleados: `manage_empleado`
  - Roles: `manage_rol`
  - Permisos: `is_admin` (staff)
