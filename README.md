# 🏠 Gastos del hogar

App React (Vite) para registrar pagos de servicios e impuestos del domicilio, con recordatorio de próximo vencimiento. Datos en Supabase, despliegue en Vercel.

## 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. SQL Editor > New query: pega el contenido de `sql/schema.sql` y pulsa Run.
3. Project Settings > API: copia **Project URL** y **anon public key**.
4. (Opcional) Authentication > Providers > Email: desactiva "Confirm email" si no quieres confirmar por correo.

## 2. Probar en tu computadora
```bash
npm install
cp .env.example .env     # pega tu URL y anon key
npm run dev
```

## 3. GitHub
```bash
git init
git add .
git commit -m "Gastos del hogar"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gastos-hogar.git
git push -u origin main
```

## 4. Vercel
1. En https://vercel.com: Add New > Project > importa el repo de GitHub.
2. Framework: Vite (se detecta solo).
3. Environment Variables: agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Después, en Supabase > Authentication > URL Configuration, pon la URL de Vercel en **Site URL**.

Abre la URL de Vercel en tu celular y usa "Añadir a pantalla de inicio" para tenerla como app.

## Recordatorios
La app avisa al abrirla (vencidos y próximos 3 días). Para avisos automáticos sin abrirla, se puede agregar después una Edge Function de Supabase con envío de correo o push.

## Estructura
```
gastos-hogar/
├── index.html
├── css/
│   └── index.css
├── js/
│   ├── main.jsx
│   ├── App.jsx
│   ├── Auth.jsx
│   ├── lib.js
│   └── supabase.js
├── sql/
│   └── schema.sql
├── package.json
├── vite.config.js
├── .env.example
└── .gitignore
```
