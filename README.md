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
