# Controle Financeiro de Renda Variável

Sistema de controle financeiro pessoal e compartilhado para três usuárias (Marilia, Wendy e Nathalia), com separação rigorosa entre dados privados e dados do grupo "Casa".

## Funcionalidades

- Login individual com dados financeiros privados
- Área compartilhada "Casa" para despesas e contas em conjunto
- Cálculo automático de quem pagou, quem deve e quem deve receber (algoritmo de acerto mínimo)
- Orçamento pessoal pelo método 50/20/10/10/10
- Controle de contas, cartões, transferências, metas, dívidas e investimentos
- Relatórios pessoais e relatórios compartilhados separados
- Interface 100% em Português (Brasil)

## Tecnologias

**Backend:** Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, JWT, bcrypt
**Frontend:** React, TypeScript, TailwindCSS, Recharts, React Hook Form, Zod, Axios, TanStack Query

## Estrutura

```
.
├── backend/         # API REST (Express + Prisma)
├── frontend/         # Aplicação React
└── docker-compose.yml
```

## Como rodar localmente (sem Docker)

### 1. Banco de dados

Suba um PostgreSQL local ou via Docker:

```bash
docker run -d --name financial_db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=financial_control -p 5432:5432 postgres:16-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

A API estará em `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicação estará em `http://localhost:3000`.

## Como rodar com Docker Compose

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

Acesse `http://localhost:3000`.

## Credenciais de demonstração (seed)

| Usuária  | E-mail              | Senha    |
|----------|---------------------|----------|
| Marilia  | marilia@casa.com    | senha123 |
| Wendy    | wendy@casa.com      | senha123 |
| Nathalia | nathalia@casa.com   | senha123 |

O seed cria o grupo "Casa", contas privadas para cada usuária, categorias pessoais (50/20/10/10/10) e categorias compartilhadas, além do exemplo obrigatório:

- Despesa "Mercado" de €222, dividida igualmente entre as 3 usuárias (€74 cada)
- Nathalia pagou €54 → deve €20 para Wendy
- Wendy pagou €168 → recebe €94 no total
- Marilia pagou €0 → deve €74 para Wendy

## Deploy em VPS

1. Clone o repositório no servidor
2. Configure o arquivo `.env` na raiz com valores de produção (troque `JWT_SECRET`)
3. Execute `docker compose up -d --build`
4. Configure um proxy reverso (Nginx/Caddy) e certificado SSL para o domínio
5. Aponte o domínio para a porta 3000 (frontend) e proteja a porta 3001 (backend) por proxy interno

## Regras de privacidade implementadas

- Toda consulta de dados privados filtra por `ownerUserId`
- Toda consulta de dados compartilhados valida membership no grupo
- Transferências não contam como receita/despesa
- Despesas compartilhadas e parcialmente compartilhadas separam corretamente valor pessoal e valor da casa
