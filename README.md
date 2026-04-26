# Belo Eventos - Plataforma de Cultura e Conexão

O **Belo Eventos** é uma plataforma completa para gestão e venda de ingressos, focada em conectar o público de Belo Jardim e região aos melhores eventos culturais. O projeto conta com um ecossistema integrado que inclui desde a experiência do usuário final até um robusto painel administrativo para controle financeiro e de atrações.

---

## Tecnologias e Stacks

<div align="center">

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)

</div>

### Ferramentas de Suporte

- **Ícones:** [Lucide Icons](https://lucide.dev/)
- **Build Tool:** Vite (Otimização de produção)
- **Persistência:** Sistema de arquivos local (JSON) com sincronização em tempo real.
- **Deploy:** Render / Railway (Suporte a Web Services Node.js).

---

## Principais Funcionalidades

### Experiência do Usuário (Frontend)

- **Hero Carousel Dinâmico:** Destaques dos principais eventos buscados em tempo real do banco de dados.
- **Checkout Inteligente:** Cálculo de faturamento automático baseado em quantidade de ingressos, taxas de serviço e juros de parcelamento.
- **Perfil do Cliente:** Histórico de compras vinculado ao ID do usuário com sincronização entre abas.
- **Filtros por Categoria:** Busca segmentada por Música, Teatro, Gastronomia e mais.

### Gestão Administrativa (Dashboard)

- **Painel Executivo:** Visualização em tempo real do lucro total, quantidade de ingressos vendidos e atrações confirmadas.
- **CRUD de Eventos:** Interface intuitiva para Criar, Editar e Remover atrações.
- **Máscara de Preço "Nubank Style":** Entrada de valores monetários intuitiva com deslocamento de casas decimais da direita para a esquerda.
- **Sincronização Híbrida:** O Dashboard une dados do servidor e cache local para garantir que nenhuma venda seja perdida.

---

## Arquitetura do Sistema

O projeto utiliza uma arquitetura unificada que facilita o deploy e a manutenção:

1.  **Backend (API Rest):** Construído em Node.js e Express, gerencia rotas de autenticação, eventos e compras.
2.  **Persistência Simples:** Utiliza arquivos `.json` na pasta `/data`, atuando como um banco de dados leve e portátil.
3.  **Frontend Multi-Page:** Cada página HTML é otimizada pelo Vite durante o build para garantir performance máxima.
4.  **Middleware de Descoberta:** O arquivo `auth-client.js` atua como um orquestrador, detectando automaticamente se deve conectar ao `localhost` ou à URL de produção.

---

## Inicialização

### Pré-requisitos

- Node.js instalado (versão 18 ou superior).
- NPM ou Yarn.

### Passo a Passo

1.  **Instale as dependências:**

    ```bash
    npm install
    ```

2.  **Inicie o servidor Backend (Obrigatório para dados):**

    ```bash
    npm run backend
    ```

    _O servidor rodará em `http://localhost:3000`._

3.  **Inicie o ambiente de desenvolvimento Frontend:**
    ```bash
    npm run dev
    ```
    _Acesse o link gerado pelo Vite (geralmente `http://localhost:5173`)._

---

## Estrutura de Pastas

```text
├── data/               # "Banco de dados" em arquivos JSON
├── dist/               # Pasta de build para produção
├── src/                # Estilos CSS e assets globais
├── server.js           # Servidor Express (API e Estáticos)
├── auth-client.js      # Lógica centralizada de comunicação com a API
├── index.html          # Página principal (Landing Page)
├── adminperfil.html    # Dashboard do Administrador
└── package.json        # Scripts e dependências
```

---

## Deploy (Produção)

O projeto está configurado para rodar perfeitamente no **Render** ou similares.

- **Comando de Build:** `npm install; npm run build`
- **Comando de Start:** `node server.js`
- **Porta:** Dinâmica (via `process.env.PORT`).

---

<div align="center">
Desenvolvido pela equipe MouraTech 2026 - FullStack
</div>
