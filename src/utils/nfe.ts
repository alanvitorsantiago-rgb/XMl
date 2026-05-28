/**
 * Utilitários para processamento e validação de chaves de NF-e
 */

export const UF_CODIGOS: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"
};

/**
 * Calcula o Dígito Verificador Módulo 11 da chave de NF-e (43 dígitos iniciais)
 * e confere com o 44º dígito.
 */
export function validateNFeDV(key: string): boolean {
  if (!/^\d{44}$/.test(key)) return false;

  const keyWithoutDV = key.substring(0, 43);
  const actualDV = parseInt(key.charAt(43), 10);

  let sum = 0;
  let weight = 2;

  // Percorre da direita para a esquerda
  for (let i = keyWithoutDV.length - 1; i >= 0; i--) {
    sum += parseInt(keyWithoutDV.charAt(i), 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const remainder = sum % 11;
  const calculatedDV = (remainder === 0 || remainder === 1) ? 0 : 11 - remainder;

  return calculatedDV === actualDV;
}

/**
 * Extrai dados estruturais a partir de uma chave de NF-e válida ou semi-válida de 44 caracteres
 */
export function extractNFeData(key: string) {
  if (key.length < 44) {
    return {
      uf: "",
      yearMonth: "",
      cnpjEmit: "",
      model: "",
      serie: "",
      number: "",
      emissionType: "",
      code: "",
      dv: ""
    };
  }

  return {
    uf: UF_CODIGOS[key.substring(0, 2)] || key.substring(0, 2),
    yearMonth: `${key.substring(4, 6)}/${key.substring(2, 4)}`, // MM/AA
    cnpjEmit: key.substring(6, 20),
    model: key.substring(20, 22),
    serie: key.substring(22, 25),
    number: key.substring(25, 34),
    emissionType: key.substring(34, 35),
    code: key.substring(35, 43),
    dv: key.substring(43, 44)
  };
}

/**
 * Formata um CNPJ no padrão XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj || "";
  return `${cnpj.substring(0, 2)}.${cnpj.substring(2, 5)}.${cnpj.substring(5, 8)}/${cnpj.substring(8, 12)}-${cnpj.substring(12, 14)}`;
}

/**
 * Extrai apenas números de uma string (excelente para limpar inputs de chaves de NF-e coladas)
 */
export function extractKeysFromString(input: string): string[] {
  if (!input) return [];
  // Procura por sequências de 44 dígitos numéricos nos bipes ou colagens
  const matches = input.match(/\b\d{44}\b/g);
  if (matches) return matches;

  // Caso seja colado linha por linha e tenha caracteres estranhos como espaços, tab ou hífens
  // Tentamos limpar linhas individualmente
  const lines = input.split(/[\r\n,;]+/);
  const cleanKeys: string[] = [];

  for (let line of lines) {
    const cleanLine = line.replace(/\D/g, "");
    if (cleanLine.length === 44) {
      cleanKeys.push(cleanLine);
    }
  }

  return cleanKeys;
}
