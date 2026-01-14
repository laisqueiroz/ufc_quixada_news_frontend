# UFC Quixadá News Frontend

Frontend para o projeto **UFC Quixadá News** utilizando **Next.js**, **React**, **TypeScript** e integração com a API backend (NestJS + Prisma + PostgreSQL).

API backend - https://github.com/Juandbpimentel/ufc_quixada_news_backend

---

## 📌 Visão Geral

Este projeto implementa o frontend da aplicação UFC Quixadá News, responsável por:

- Exibir notícias e conteúdos consumidos da API.
- Gerenciar navegação, rotas e interface responsiva.
- Autenticação e integração com backend via REST API.
- Componentização com React e organização escalável para sprints de desenvolvimento.

---

## 🧩 Tecnologias

O frontend conta com:

| Tecnologia | Finalidade |
|------------|------------|
| Next.js    | Estrutura do projeto e roteamento |
| React      | Biblioteca UI |
| TypeScript | Tipagem estática |
| Axios      | Requisições HTTP |
| TanStack Query | Cache / estado de dados assíncronos |
| Tailwind CSS | Estilização |
| ESLint & Prettier | Linting e formatação |

---

## 🚀 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js 18** ou superior  
- **npm** ou **yarn**  
- Backend em execução (NestJS + Prisma) em **http://localhost:3001**  
- Variáveis de ambiente configuradas

---

## 🛠️ Instalação e Setup

Clone o repositório:

```bash
git clone https://github.com/seu-usuario/ufc_quixada_news_frontend.git
cd ufc_quixada_news_frontend   
```

Instale dependências:  

```bash
npm install
# ou
yarn  
```

## 🔧 Variáveis de Ambiente

Crie um arquivo .env.local na raiz do frontend com:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```
> Ajuste a URL caso o backend esteja rodando em outra porta ou domínio.


