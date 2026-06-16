export function parseAIReport(text: string) {
  const result = {
    investedValue: 0,
    revenueGenerated: 0,
    leadsGenerated: 0,
    clientsClosed: 0,
    campaignName: '',
  };

  const normalizedText = text.replace(/R\$\s*/gi, '').replace(/\n/g, ' ');

  const extractCurrency = (keywords: string) => {
    // Procura a palavra-chave e pega o primeiro número na frente dela (até 50 caracteres)
    const regex = new RegExp(`(?:${keywords})[^\\d]{0,50}?([\\d.,]+)`, 'i');
    const match = normalizedText.match(regex);
    if (match && match[1]) {
      let valStr = match[1].replace(/\./g, '').replace(',', '.').trim();
      return parseFloat(valStr) || 0;
    }
    return 0;
  };

  const extractNumber = (keywords: string) => {
    // Tenta primeiro: "45 leads"
    const regex1 = new RegExp(`(\\d+)[^\\d]{0,20}?(?:${keywords})`, 'i');
    const match1 = normalizedText.match(regex1);
    if (match1 && match1[1]) return parseInt(match1[1], 10);

    // Tenta depois: "leads: 45"
    const regex2 = new RegExp(`(?:${keywords})[^\\d]{0,30}?(\\d+)`, 'i');
    const match2 = normalizedText.match(regex2);
    if (match2 && match2[1]) return parseInt(match2[1], 10);

    return 0;
  };

  result.investedValue = extractCurrency('investido|gasto|custo|investimento|orçamento|investimos');
  result.revenueGenerated = extractCurrency('faturamento|receita|retorno|vendas total|valor gerado|lucro|faturamos|geramos');
  result.leadsGenerated = extractNumber('leads|cadastros|contatos|inscrições|conversões de lead|pessoas');
  result.clientsClosed = extractNumber('clientes|vendas|fechamentos|conversões de venda|compras|fechados');

  const nameMatch = normalizedText.match(/(?:campanha|nome da campanha)[^\w]{0,20}?([a-zA-Z0-9À-ÿ\s-]+)/i);
  if (nameMatch && nameMatch[1]) {
    result.campaignName = nameMatch[1].trim().substring(0, 50);
  }

  return result;
}
