# RiskCoop

Dashboard Next.js para alerta temprana de mora en cooperativas.

## Ejecutar

```bash
npm install
npm run dev -- -H 127.0.0.1 -p 3005
```

Abrir `http://127.0.0.1:3005`.

## Variables de entorno

Copiar `.env.example` a `.envs` y configurar:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

Si Supabase no esta configurado, el dashboard usa los CSV locales. Si Gemini no esta configurado, el chatbot responde con un resumen local del dashboard.