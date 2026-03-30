/**
 * Parser de faturas simplificadas do Continente (formato INSCO).
 * Extrai cabeçalho, data, loja e linhas de produto.
 */

export interface InvoiceItem {
  description: string   // descrição original da fatura
  category: string      // secção da fatura (ex: "Mercearia Salgada")
  unitPrice: number     // preço por unidade / kg
  quantity: number      // quantidade comprada (pode ser decimal para peso)
  ivaCode: string       // A / B / C
}

export interface ParsedInvoice {
  invoiceNumber: string
  date: string             // YYYY-MM-DD
  supermarketName: string
  supermarketLocation: string
  total: number
  items: InvoiceItem[]
}

function toFloat(str: string): number {
  return parseFloat(str.replace(',', '.'))
}

/**
 * Converte o texto extraído do PDF numa estrutura de dados da fatura.
 */
export function parseInvoice(text: string): ParsedInvoice {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  // ── Cabeçalho: nome da loja ────────────────────────────────────────────────
  let supermarketName = 'Continente'
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    if (/continente/i.test(lines[i]) && lines[i].length < 50) {
      supermarketName = lines[i].trim()
      break
    }
  }

  // Localização: linha com código postal português (NNNN-NNN)
  let supermarketLocation = ''
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    if (/\d{4}-\d{3}/.test(lines[i])) {
      supermarketLocation = lines[i].replace(/\s+/g, ' ').trim()
      break
    }
  }

  // ── Número e data da fatura ────────────────────────────────────────────────
  // "Nro:FS NKG005/628755 30/03/2026 16:53"
  // "Nro:FT BEU010/074127 23/03/2026 15:46"
  let invoiceNumber = ''
  let date = new Date().toISOString().split('T')[0]

  for (const line of lines) {
    const m = line.match(/Nro\s*:?\s*(F[STR]\s+\S+)\s+(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) {
      invoiceNumber = m[1].replace(/\s+/, ' ')
      date = `${m[4]}-${m[3]}-${m[2]}`
      break
    }
  }

  // ── Total ──────────────────────────────────────────────────────────────────
  let total = 0
  for (const line of lines) {
    const m = line.match(/^TOTAL\s+A\s+PAGAR\s+([\d,]+)$/)
    if (m) { total = toFloat(m[1]); break }
  }

  // ── Itens ──────────────────────────────────────────────────────────────────
  // Encontrar início da secção de produtos (após "IVA DESCRICAO VALOR")
  let startIdx = 0
  for (let i = 0; i < lines.length; i++) {
    if (/IVA\s+DESCRI/i.test(lines[i])) { startIdx = i + 1; break }
  }

  const items: InvoiceItem[] = []
  let currentCategory = 'Outros'
  let pending: { description: string; category: string; ivaCode: string } | null = null

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    
    // Fim da secção de produtos
    if (/^(SUBTOTAL|TOTAL\s+A\s+PAGAR|%IVA\s+Total|Total\s+de\s+descontos)/i.test(line)) break

    // Linha de desconto/poupança — ignorar
    if (/^(POUBAN|POUPA[NÇ]|Desconto\s+Cartao)/i.test(line)) continue

    // Cabeçalho de categoria: linha que termina em ":" sem começar por "(" ou dígito
    if (/^[^(\d].+:$/.test(line)) {
      currentCategory = line.slice(0, -1).trim()
      pending = null
      continue
    }

    // Linha de quantidade/peso: "2 X 1,14 2,28"  ou  "0,455 X 3,39 1,54"
    const qtyLine = line.match(/^([\d,]+)\s+[Xx]\s+([\d,]+)\s+([\d,]+)$/)
    if (qtyLine && pending) {
      items.push({
        ...pending,
        quantity: toFloat(qtyLine[1]),
        unitPrice: toFloat(qtyLine[2]),
      })
      pending = null
      continue
    }

    // Linha de produto: "(A) DESCRICAO [PRECO]"
    const productLine = line.match(/^\((A|B|C)\)(\s|)+(.+)$/)
    console.log(line)
    if (productLine) {
      if (pending) {
        // item anterior sem continuação — assumir qty=1 e sem preço conhecido
        items.push({ ...pending, quantity: 1, unitPrice: 0 })
      }

      const ivaCode = productLine[1]
      const content = productLine[2].trim()

      // O preço no fim da linha tem sempre exatamente 2 casas decimais: "1,99"
      const tokens = content.split(/\s+/)
      const last = tokens[tokens.length - 1]
      const isPrice = /^\d+,\d{2}$/.test(last)

      if (isPrice) {
        items.push({
          description: tokens.slice(0, -1).join(' '),
          category: currentCategory,
          ivaCode,
          unitPrice: toFloat(last),
          quantity: 1,
        })
        pending = null
      } else {
        // preço/quantidade na linha seguinte
        pending = { description: content, category: currentCategory, ivaCode }
      }
    }
  }

  return { invoiceNumber, date, supermarketName, supermarketLocation, total, items }
}

// ── Utilitários usados pelo controller ────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'Mercearia Salgada': 'Mercearia',
  'Mercearia Doce': 'Mercearia Doce',
  'Limpeza do Lar': 'Limpeza',
  'Laticinios/Beb. Veg.': 'Lacticínios',
  'Bens Essenciais': 'Mercearia',
  'Charcutaria&Queijos': 'Charcutaria',
  'Pequeno Almoco': 'Pequeno-Almoço',
  'Frutas e Legumes': 'Frutas e Legumes',
  'Padaria': 'Padaria',
  'Vinho e Espirituosas': 'Bebidas',
  'Soft Drinks': 'Bebidas',
  'Interiores Infantil': 'Outros',
  'Casa-Cozinha/Lavand': 'Casa',
}

export function normalizeCategory(raw: string): string {
  return CATEGORY_MAP[raw] ?? raw
}

/** Título de cada palavra, útil para sugerir nome de produto */
export function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Sugere a unidade do produto com base na descrição e na quantidade comprada.
 * - Quantidade decimal → vendido ao peso → "kg"
 * - Descrição com indicador de volume → "L" / "ml" / "cl"
 * - Tudo o resto → "un"
 */
export function suggestUnit(description: string, quantity: number): string {
  // Vendido ao peso (ex: 0,455 kg de kiwi)
  if (!Number.isInteger(quantity) && quantity < 10) return 'kg'

  const upper = description.toUpperCase()
  if (/ \d+L\b/.test(upper) || upper.endsWith(' L')) return 'L'
  if (/\d+(ML|CL)\b/.test(upper)) return upper.includes('CL') ? 'cl' : 'ml'
  return 'un'
}
