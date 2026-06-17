import { parseAIReport } from './src/utils/aiParser.js';

const text = `
E aí galera, a campanha Vendas Janeiro mandou super bem.
A gente teve um custo de 500 reais.
Geramos uma receita top de R$2.500,50!
Conseguimos 45 leads gerados e no fim fechamos 5 clientes.
`;

console.log(parseAIReport(text));
