import type { VercelRequest, VercelResponse } from "@vercel/node";

// =========================================================================
// Mapa de UFs (Unidades Federativas) do Brasil
// =========================================================================
const UF_MAP: Record<string, { sigla: string; nome: string }> = {
  "11": { sigla: "RO", nome: "Rondônia" },
  "12": { sigla: "AC", nome: "Acre" },
  "13": { sigla: "AM", nome: "Amazonas" },
  "14": { sigla: "RR", nome: "Roraima" },
  "15": { sigla: "PA", nome: "Pará" },
  "16": { sigla: "AP", nome: "Amapá" },
  "17": { sigla: "TO", nome: "Tocantins" },
  "21": { sigla: "MA", nome: "Maranhão" },
  "22": { sigla: "PI", nome: "Piauí" },
  "23": { sigla: "CE", nome: "Ceará" },
  "24": { sigla: "RN", nome: "Rio Grande do Norte" },
  "25": { sigla: "PB", nome: "Paraíba" },
  "26": { sigla: "PE", nome: "Pernambuco" },
  "27": { sigla: "AL", nome: "Alagoas" },
  "28": { sigla: "SE", nome: "Sergipe" },
  "29": { sigla: "BA", nome: "Bahia" },
  "31": { sigla: "MG", nome: "Minas Gerais" },
  "32": { sigla: "ES", nome: "Espírito Santo" },
  "33": { sigla: "RJ", nome: "Rio de Janeiro" },
  "35": { sigla: "SP", nome: "São Paulo" },
  "41": { sigla: "PR", nome: "Paraná" },
  "42": { sigla: "SC", nome: "Santa Catarina" },
  "43": { sigla: "RS", nome: "Rio Grande do Sul" },
  "50": { sigla: "MS", nome: "Mato Grosso do Sul" },
  "51": { sigla: "MT", nome: "Mato Grosso" },
  "52": { sigla: "GO", nome: "Goiás" },
  "53": { sigla: "DF", nome: "Distrito Federal" }
};

// =========================================================================
// Gera XML de NF-e estruturado e realista para simulação fiscal
// =========================================================================
function generateSimulatedNFeXML(key: string): string {
  if (key.length !== 44) {
    return `<error>Chave inválida. Tamanho esperado: 44 caracteres.</error>`;
  }

  const ufCode = key.substring(0, 2);
  const aaMm = key.substring(2, 6);
  const cnpjEmit = key.substring(6, 20);
  const mod = key.substring(20, 22);
  const serie = key.substring(22, 25);
  const numero = key.substring(25, 34);
  const tpEmis = key.substring(34, 35);
  const cNF = key.substring(35, 43);
  const cDV = key.substring(43, 44);

  const ufData = UF_MAP[ufCode] || { sigla: "SP", nome: "São Paulo" };
  const ano = "20" + aaMm.substring(0, 2);
  const mes = aaMm.substring(2, 4);

  const items = [
    { desc: "KIT ESCOLAR INFANTIL - CADERNOS E LAPIS", qnt: "250.0000", val: "15.40", total: "3850.00" },
    { desc: "LIVRO DIDATICO MATEMATICA ENSINO FUNDAMENTAL", qnt: "120.0000", val: "42.10", total: "5052.00" },
    { desc: "ESTOJO ESCOLAR COMPACTO AZUL", qnt: "300.0000", val: "8.50", total: "2550.00" },
  ];

  const totalNFe = items.reduce((acc, current) => acc + parseFloat(current.total), 0).toFixed(2);
  const randomCnpjDest = "00582236000101";

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${key}" versao="4.00">
      <ide>
        <cUF>${ufCode}</cUF>
        <cNF>${cNF}</cNF>
        <natOp>Venda de mercadoria adquirida de terceiros</natOp>
        <mod>${mod}</mod>
        <serie>${parseInt(serie, 10)}</serie>
        <nNF>${parseInt(numero, 10)}</nNF>
        <dhEmi>${ano}-${mes}-15T14:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>${ufCode}00604</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>${tpEmis}</tpEmis>
        <cDV>${cDV}</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>0</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>LogisticsXMLAuto_v1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpjEmit}</CNPJ>
        <xNome>DISTRIBUIDORA DE MATERIAIS DIDATICOS ESCOLARES BRASIL LTDA</xNome>
        <xFant>Distribuidora Brasil</xFant>
        <enderEmit>
          <xlgr>AVENIDA INDUSTRIAL DA AMBICAO</xlgr>
          <n>1500</n>
          <xBairro>VILA INDUSTRIAL</xBairro>
          <cMun>${ufCode}00604</cMun>
          <xMun>CENTRAL DA DISTRIBUICAO</xMun>
          <UF>${ufData.sigla}</UF>
          <CEP>04015010</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
          <fone>1155551234</fone>
        </enderEmit>
        <IE>111222333444</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>${randomCnpjDest}</CNPJ>
        <xNome>PREFEITURA MUNICIPAL - DEPARTAMENTO DE EDUCACAO E TRANSPORTES</xNome>
        <enderDest>
          <xlgr>PRACA DO MUNICIPIO CENTRAL</xlgr>
          <n>100</n>
          <xBairro>CENTRO</xBairro>
          <cMun>${ufCode}00508</cMun>
          <xMun>CIDADE DE DESTINO</xMun>
          <UF>${ufData.sigla}</UF>
          <CEP>13010000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>KIT-001</cProd>
          <cEAN>7891000200301</cEAN>
          <xProd>${items[0].desc}</xProd>
          <NCM>48201000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>${items[0].qnt}</qCom>
          <vUnCom>${items[0].val}</vUnCom>
          <vProd>${items[0].total}</vProd>
          <cEANTrib>7891000200301</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>${items[0].qnt}</qTrib>
          <vUnTrib>${items[0].val}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <vTotTrib>510.20</vTotTrib>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>${items[0].total}</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>693.00</vICMS>
            </ICMS00>
          </ICMS>
          <IPI>
            <cEnq>999</cEnq>
            <IPINT>
              <CST>53</CST>
            </IPINT>
          </IPI>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>${items[0].total}</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>63.53</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>${items[0].total}</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>292.60</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <cProd>LIV-402</cProd>
          <cEAN>7891000205802</cEAN>
          <xProd>${items[1].desc}</xProd>
          <NCM>49019900</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>${items[1].qnt}</qCom>
          <vUnCom>${items[1].val}</vUnCom>
          <vProd>${items[1].total}</vProd>
          <cEANTrib>7891000205802</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>${items[1].qnt}</qTrib>
          <vUnTrib>${items[1].val}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <vTotTrib>0.00</vTotTrib>
          <ICMS>
            <ICMS40>
              <orig>0</orig>
              <CST>41</CST>
            </ICMS40>
          </ICMS>
          <IPI>
            <cEnq>999</cEnq>
            <IPINT>
              <CST>53</CST>
            </IPINT>
          </IPI>
          <PIS>
            <PISNT>
              <CST>08</CST>
            </PISNT>
          </PIS>
          <COFINS>
            <COFINSNT>
              <CST>08</CST>
            </COFINSNT>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>${totalNFe}</vBC>
          <vICMS>693.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${totalNFe}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>63.53</vPIS>
          <vCOFINS>292.60</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${totalNFe}</vNF>
          <vTotTrib>510.20</vTotTrib>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>1</modFrete>
        <transporta>
          <CNPJ>99999999000199</CNPJ>
          <xNome>RAPIDO ESCOLAR E DISTRIBUICAO LOGISTICA S/A</xNome>
          <IE>999888777666</IE>
          <xEnder>RUA DAS CARRETAS, 450</xEnder>
          <xMun>TRANSPORTLANDIA</xMun>
          <UF>${ufData.sigla}</UF>
        </transporta>
        <vol>
          <qVol>670</qVol>
          <esp>VOLUMES</esp>
          <pesoL>450.500</pesoL>
          <pesoB>475.200</pesoB>
        </vol>
      </transp>
      <pag>
        <detPag>
          <indPag>0</indPag>
          <tPag>15</tPag>
          <vPag>${totalNFe}</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>CARGA DESTINADA AO ATENDIMENTO DOS PROGRAMAS DE TRANSPORTE E DISTRIBUICAO ESCOLAR. LOTE SELECIONADO: LOTE ESCOLA AUTO-PROCESSADO. OPERADOR AUTOMATICO SISTEMICO.</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt Id="ID351000100234567">
      <tpAmb>1</tpAmb>
      <verAplic>SP-NFe-15-11-2025</verAplic>
      <chNFe>${key}</chNFe>
      <dhRecb>${ano}-${mes}-15T14:35:45-03:00</dhRecb>
      <nProt>${ufCode}0023456789</nProt>
      <digVal>g6o24Mdfw+76fRgdgSDfGty/E=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

// =========================================================================
// Handler principal — Vercel Serverless Function
// =========================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas POST é aceito
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", error: "Método não permitido. Use POST." });
  }

  try {
    const { key, apiKey, apiUrl, mode, simulateDelay } = req.body;

    if (!key || key.length !== 44) {
      return res.status(400).json({
        status: "error",
        key: key || "Vazio",
        error: "Chave inválida. Chaves de NF-e devem conter exatamente 44 dígitos numéricos."
      });
    }

    // =====================================================================
    // MODO REAL — Integração com API do Meu Danfe
    // =====================================================================
    if (mode === "real") {
      const finalApiKey = apiKey || process.env.MEU_DANFE_API_KEY;
      const finalApiUrl = apiUrl || process.env.MEU_DANFE_API_URL || "https://api.meudanfe.com.br/v1/xml";

      if (!finalApiKey) {
        return res.status(400).json({
          status: "error",
          key,
          error: "Token ou Chave de API do 'Meu Danfe' não configurada. Configure o token nas configurações ou utilize o modo homologação."
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        let urlWithParams = finalApiUrl;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (finalApiKey) {
          headers["Authorization"] = `Bearer ${finalApiKey}`;
          headers["X-API-Key"] = finalApiKey;
          headers["token"] = finalApiKey;
        }

        const isGet = finalApiUrl.toUpperCase().includes("GET") || !finalApiUrl;
        let fetchRes;

        if (isGet) {
          const separator = finalApiUrl.includes("?") ? "&" : "?";
          urlWithParams = `${finalApiUrl}${separator}chave=${key}&apiKey=${finalApiKey}&token=${finalApiKey}`;
          fetchRes = await fetch(urlWithParams, {
            method: "GET",
            headers,
            signal: controller.signal
          });
        } else {
          fetchRes = await fetch(finalApiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ chave: key, token: finalApiKey, key }),
            signal: controller.signal
          });
        }

        clearTimeout(timeoutId);

        if (!fetchRes.ok) {
          const textResponse = await fetchRes.text().catch(() => "");
          throw new Error(`Erro na API Meu Danfe (${fetchRes.status}): ${textResponse || fetchRes.statusText}`);
        }

        const responseBody = await fetchRes.text();
        let xmlContent = responseBody;

        if (responseBody.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(responseBody);
            xmlContent = parsed.xml || (parsed.base64 ? Buffer.from(parsed.base64, "base64").toString("utf-8") : responseBody);
          } catch (e) {
            // Mantém texto original
          }
        }

        if (!xmlContent || (!xmlContent.includes("<nfeProc") && !xmlContent.includes("<NFe"))) {
          throw new Error("Resposta da API recebida, mas não continha uma tag de NF-e válida.");
        }

        return res.json({
          status: "success",
          key,
          xmlContent,
          source: "meu_danfe_api"
        });

      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        return res.status(502).json({
          status: "error",
          key,
          error: `Falha na API Real: ${fetchErr.message || "Timeout na requisição."}`
        });
      }
    }

    // =====================================================================
    // MODO SIMULAÇÃO — Geração de XML local
    // =====================================================================
    const delayValue = simulateDelay ? Math.floor(Math.random() * 400) + 200 : 0;
    if (delayValue > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayValue));
    }

    if (key.startsWith("00")) {
      return res.status(404).json({
        status: "error",
        key,
        error: "Erro na Simulação: NF-e inexistente na base de dados nacional (SEFAZ)."
      });
    }

    const xmlContent = generateSimulatedNFeXML(key);

    return res.json({
      status: "success",
      key,
      xmlContent,
      source: "simulador_logistico_interno"
    });

  } catch (err: any) {
    return res.status(500).json({
      status: "error",
      key: req.body?.key || "Chave Desconhecida",
      error: `Erro interno do servidor: ${err.message}`
    });
  }
}
