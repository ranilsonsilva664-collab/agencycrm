export function parseAIReport(text: string) {
  const result = {
    investedValue: 0,
    revenueGenerated: 0,
    leadsGenerated: 0,
    clientsClosed: 0,
    campaignName: '',
  };

  const extractCurrency = (regex: RegExp) => {
    const match = text.match(regex);
    if (match && match[1]) {
      let valStr = match[1].replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.').trim();
      return parseFloat(valStr) || 0;
    }
    return 0;
  };

  const extractNumber = (regex: RegExp) => {
    const match = text.match(regex);
    if (match && match[1]) {
      return parseInt(match[1].trim(), 10) || 0;
    }
    return 0;
  };

  result.investedValue = extractCurrency(/(?:investido|gasto|custo|investimento)[\s]*:?[\s]*(?:R\$)?[\s]*([\d.,]+)/i);
  result.revenueGenerated = extractCurrency(/(?:faturamento|receita|retorno|vendas total|valor gerado)[\s]*:?[\s]*(?:R\$)?[\s]*([\d.,]+)/i);
  result.leadsGenerated = extractNumber(/(?:leads|cadastros|contatos|inscrições|conversões de lead)[\s]*:?[\s]*(\d+)/i);
  result.clientsClosed = extractNumber(/(?:clientes|vendas|fechamentos|conversões de venda|compras)[\s]*:?[\s]*(\d+)/i);

  const nameMatch = text.match(/(?:campanha|nome da campanha)[\s]*:?[\s]*([^\n]+)/i);
  if (nameMatch && nameMatch[1]) {
    result.campaignName = nameMatch[1].trim();
  }

  return result;
}
