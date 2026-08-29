# Finanças Diárias

PWA mobile-first para controle de limite semanal e mensal, sem login.

## Recursos
- Dashboard de limite semanal e mensal
- Semana de domingo a sábado
- Lançamento, edição e exclusão de gastos
- Histórico do mês atual
- Tela "Virar o mês" para configurar limites
- PWA instalável em Android e iPhone
- Backend em Cloudflare Pages Functions
- Banco Cloudflare D1

## Desenvolvimento local

```bash
npm install
npm run dev
```

Para testar também a API/D1 localmente, use Wrangler/Cloudflare Pages dev após configurar D1.

## Banco

Migration: `migrations/0001_initial.sql`.
