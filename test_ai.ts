import { parseAIReport } from './src/utils/aiParser.ts';

const text = `
Resumo da campanha:
Campanha: Vendas Black Friday
Investimento: R$ 1.500,00
Faturamento: R$ 5.000,00
Leads: 150
Clientes: 10
`;

console.log(parseAIReport(text));
