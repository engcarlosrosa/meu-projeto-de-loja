<<<<<<< HEAD
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
StyleHub | Sistema de Gestão para Varejo de Moda (PDV & ERP)

📖 Sobre o Projeto
O StyleHub é um sistema de Ponto de Venda (PDV) e gestão (ERP) completo, construído com React e Firebase, projetado especificamente para as necessidades de lojas de roupas e do setor de varejo de moda. A plataforma centraliza o controle de vendas, estoque, finanças e clientes em uma interface moderna, reativa e multi-loja.

Este projeto foi desenvolvido como uma solução robusta para otimizar a operação diária de um negócio de varejo, desde a venda no balcão até a análise de dados gerenciais no dashboard.

✨ Funcionalidades Principais
O sistema é dividido em módulos que cobrem todas as áreas essenciais da gestão de uma loja:

🛒 Ponto de Venda (PDV):
Interface de vendas rápida e intuitiva.
Busca de produtos por nome, código ou código de barras.
Carrinho de compras dinâmico.
Gestão de clientes (busca e cadastro rápido).
Múltiplos métodos de pagamento por venda.
Aplicação de descontos com sistema de aprovação por administrador.
Lógica completa para trocas e devoluções.

📦 Gestão de Inventário:
Catálogo de Produtos Global: Centraliza todos os produtos, com suporte a variações complexas (cor, tamanho, etc.).
Controle de Estoque por Loja: O estoque de cada variação de produto é controlado individualmente para cada loja.
Entrada de Mercadorias: Registo de notas de compra que atualizam o estoque automaticamente.
Contagem de Estoque (Balanço): Ferramenta para realizar e registar o inventário físico, com relatórios de discrepância.
Ajustes Manuais: Interface dedicada para ajustes diretos no estoque de cada loja.

💰 Financeiro:Contas a Pagar: Lançamento de compras e despesas, com controle de parcelas e vencimentos.
Fechamento de Caixa: Controle de sessão de caixa por loja, com registo de abertura, suprimentos, sangrias e resumo de vendas por método de pagamento e por vendedor.
Visão Geral Financeira: Gestão de contas bancárias e histórico de transações.
Lançamento de Receitas: Registo de outras receitas além das vendas.

📈 Relatórios e Dashboard:
Dashboard dinâmico com KPIs (Key Performance Indicators) de vendas, produtos vendidos e finanças.
Gráficos de vendas diárias e mensais.
Alerta de produtos com estoque baixo.
Gerador de relatórios de vendas, desempenho de produtos e DRE financeiro.
Análise de dados com IA (Inteligência Artificial) para insights estratégicos.

⚙️ Administração:
Gestão Multi-Loja: O administrador pode alternar a visualização de dados entre as diferentes lojas.
Controle de Acesso por Perfil: Sistema de autenticação com diferentes níveis de permissão (Administrador, Gerente, Vendedor, Financeiro).
Gestão de Atributos: Cadastro de categorias, cores, tamanhos, fornecedores, etc.

🚀 Tecnologias Utilizadas
Frontend:
React.js: Biblioteca principal para a construção da interface.
React Router: Para a gestão de rotas da aplicação (SPA).
Lucide React: Para os ícones.
Backend & Base de Dados:
Firebase: Plataforma utilizada para:
Authentication: Controlo de login e perfis de utilizador.
Firestore: Base de dados NoSQL em tempo real para todos os dados da aplicação.
Hosting: Para a publicação do projeto.

Estilização:CSS-in-JS para estilização de componentes.

🏁 Como Executar o ProjetoPara executar o projeto localmente, siga os passos abaixo:
Clone o repositório:git clone [https://github.com/engcarlosrosa/meu-projeto-de-loja.git](https://github.com/engcarlosrosa/meu-projeto-de-loja.git)

Instale as dependências:
cd meu-projeto-de-loja
npm install

Configure o Firebase:
Crie um projeto no console do Firebase.
Ative os serviços de Authentication e Firestore.
Obtenha as credenciais de configuração do seu projeto.
Crie um ficheiro .env na raiz do projeto e adicione as suas credenciais:
REACT_APP_FIREBASE_API_KEY=sua_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=seu_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=seu_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
REACT_APP_FIREBASE_APP_ID=seu_app_id

Execute a aplicação:
npm start

A aplicação estará disponível em http://localhost:3000.

👨‍💻 AutorFeito com ❤️ por Carlos Rosa 
LinkedIn: linkedin.com/in/carlos-rosa-9570bb119/
GitHub: @engcarlosrosa
>>>>>>> b5df4c677274bcc66e3c96bf87197bca6b1743cf
