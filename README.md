# Gastos del hogar (Vercel + Supabase)

Sitio estático (sin build) con base de datos en la nube y login. Registra los pagos de servicios e impuestos del domicilio (servicio, descripción, monto y fecha de pago) y avisa cuándo toca pagar de nuevo.

- **Vencimientos:** próximo vencimiento de cada servicio, con alerta de los vencidos y los que vencen en 3 días o menos.
- **Pagos:** historial con búsqueda, filtro por servicio y por fechas; permite editar y eliminar.
- **Resumen:** total del año por servicio y por mes.

Cada usuario ve solo sus propios pagos (lo aplica la base de datos).

## Estructura
```
index.html        → estructura de la página (HTML)
css/styles.css    → estilos
assets/logo.png   → logo que aparece en la pestaña del navegador (reemplázalo por el tuyo)
js/config.js      → URL y clave de Supabase (lo único que debes editar)
js/app.js         → lógica de la aplicación
sql/              → scripts de la base de datos (se ejecutan en Supabase)
```

## 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. Authentication → Sign In / Providers → Email: **desactiva "Allow new users to sign up"**.
3. Authentication → Users → **Add user**: crea tu usuario (y el de quien más use la app). Marca "Auto confirm".
4. SQL Editor: ejecuta `sql/supabase.sql`.
5. Project Settings → API: copia **Project URL** y la clave **anon public**.

## 2. Configurar
Pega la URL y la clave anon en `js/config.js`.

## 3. Publicar en Vercel
1. Sube esta carpeta a un repositorio de GitHub.
2. vercel.com → Add New → Project → importa el repositorio.
3. Framework Preset: **Other**. Sin build command ni output directory. Deploy.
4. (Opcional) Settings → Domains para usar tu dominio.

## Cómo funcionan los avisos
Al registrar un pago indicas el **día del mes en que vence de nuevo**. El próximo vencimiento es ese día en el mes siguiente al pago. La app muestra el aviso cada vez que la abres. Para tenerla como app en el celular, usa "Añadir a pantalla de inicio" desde el navegador.

## Logo
Para cambiar el logo de la pestaña del navegador, reemplaza `assets/logo.png` por tu imagen conservando el mismo nombre (PNG cuadrado, de 512×512 px si es posible). Vuelve a desplegar y recarga con Ctrl+F5, porque el navegador guarda los íconos en caché.

## Notas
- Los permisos los aplica la base de datos, no solo la pantalla.
- El historial muestra los últimos 2000 pagos.
