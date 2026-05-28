import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Barcode, 
  FileText, 
  AlertTriangle, 
  ShieldAlert, 
  Settings, 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle, 
  Server, 
  ExternalLink, 
  HelpCircle, 
  Cpu, 
  History,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";

// Tipos, componentes e utils
import { NfeItem, LoteHistory, SystemConfig, ActivityLog } from "./types";
import { validateNFeDV, extractNFeData, formatCNPJ, extractKeysFromString } from "./utils/nfe";
import ConfigModal from "./components/ConfigModal";
import LogsPanel from "./components/LogsPanel";
import LoteHistoryPanel from "./components/LoteHistoryPanel";

// Chave para persistência local
const STORAGE_PREFIX = "logistica_xml_";

export default function App() {
  // Configuração padrão
  const [config, setConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}config`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      mode: "simulation",
      apiKey: "",
      apiUrl: "https://api.meudanfe.com.br/v1/xml",
      concurrency: 5,
      maxRetries: 3,
      simulateDelay: true,
      autoZip: true
    };
  });

  // Salva configurações sempre que houver alteração
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}config`, JSON.stringify(config));
  }, [config]);

  // Estados principais
  const [items, setItems] = useState<NfeItem[]>([]);
  const [history, setHistory] = useState<LoteHistory[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}history`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  
  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}logs`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: "init",
        timestamp: new Date().toISOString(),
        type: "info",
        message: "Plataforma Zetalog Logística e Transportes iniciada. Pronto para receber bipes de chaves NF-e."
      }
    ];
  });

  // Estados de UI e Controle
  const [barcodeInput, setBarcodeInput] = useState("");
  const [pastedInput, setPastedInput] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  
  // Nome do lote atual ajustável pelo operador
  const [loteName, setLoteName] = useState(() => {
    const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    return `LOTE_ZETALOG_${date}`;
  });

  // Refs de controle de processo concorrente e input do leitor
  const abortControllerRef = useRef<AbortController | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const processingRef = useRef(false);

  // Auto focus no input de bipagem do leitor ao iniciar ou clicar na tela
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [showPasteBox]);

  // Salva histórico no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}history`, JSON.stringify(history));
  }, [history]);

  // Salva logs no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}logs`, JSON.stringify(logs));
  }, [logs]);

  // Verifica saúde do backend Express local ao iniciar
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          setBackendOnline(true);
          addLog("success", "Integração segura com backend local estabelecida com sucesso.");
        } else {
          setBackendOnline(false);
          addLog("warning", "O servidor local retornou um status inesperado. A operação do gateway poderá falhar.");
        }
      } catch (err) {
        setBackendOnline(false);
        addLog("error", "Não foi possível conectar ao servidor backend de automação física. Verifique localmente.");
      }
    };
    checkBackend();
  }, []);

  // Adiciona um log operacional novo e expurga os mais antigos (limite de 150 para desempenho)
  const addLog = (type: ActivityLog["type"], message: string) => {
    setLogs((prev) => {
      const newLog: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        type,
        message
      };
      
      // Auto-rola terminal para baixo se o usuário desejar
      setTimeout(() => {
        const terminal = document.getElementById("logs-terminal");
        if (terminal) {
          terminal.scrollTop = terminal.scrollHeight;
        }
      }, 50);

      return [...prev.slice(-149), newLog];
    });
  };

  // Limpa os logs operacionais
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Extração inteligente de dados reativos do lote e validação de CNPJ ÚNICO
  const {
    cnpjReferencia,      // CNPJ esperado para o lote (do primeiro item válido)
    hasCNPJConflict,     // Booleano se há algum CNPJ diferente na fila
    conflitoCount,       // Quantas notas com CNPJ diferente de referência
    validKeysCount,      // Total de notas válidas com DV correto
    invalidVendingKeys   // Quantas chaves tem DV incorreto
  } = useMemo(() => {
    let cnpjRef = "";
    let conflict = false;
    let conflictCount = 0;
    let validCount = 0;
    let invalidCount = 0;

    // Encontra o primeiro CNPJ válido
    for (const item of items) {
      if (item.key.length === 44) {
        if (!cnpjRef) {
          cnpjRef = item.cnpjEmit;
        }
      }
    }

    // Calcula conflitos, DVs válidos e inválidos
    items.forEach((item) => {
      if (item.key.length === 44) {
        if (cnpjRef && item.cnpjEmit !== cnpjRef) {
          conflict = true;
          conflictCount++;
        }
        if (item.isValidDv) {
          validCount++;
        } else {
          invalidCount++;
        }
      }
    });

    return {
      cnpjReferencia: cnpjRef,
      hasCNPJConflict: conflict,
      conflitoCount: conflictCount,
      validKeysCount: validCount,
      invalidVendingKeys: invalidCount
    };
  }, [items]);

  // Função centralizada para inserir chaves de forma segura e inteligível na fila
  const addKeysToQueue = (keys: string[]) => {
    if (keys.length === 0) return;

    let added = 0;
    let duplicates = 0;
    let invalidStr = 0;

    setItems((prev) => {
      const keysMap = new Map(prev.map(item => [item.key, item]));
      const newItems: NfeItem[] = [];

      keys.forEach((key) => {
         const cleanKey = key.replace(/\D/g, "");
         if (cleanKey.length !== 44) {
           invalidStr++;
           return;
         }

         if (keysMap.has(cleanKey)) {
           duplicates++;
           return;
         }

         const data = extractNFeData(cleanKey);
         const validDv = validateNFeDV(cleanKey);

         const newItem: NfeItem = {
           key: cleanKey,
           number: data.number,
           cnpjEmit: data.cnpjEmit,
           serie: data.serie,
           ufCode: data.uf,
           status: "pending",
           isValidDv: validDv,
           retries: 0
         };

         newItems.push(newItem);
         keysMap.set(cleanKey, newItem);
         added++;
      });

      return [...prev, ...newItems];
    });

    // Registra feedbacks no painel de log
    if (added > 0) {
      addLog("success", `Adicionadas ${added} novas chaves NF-e válidas e prontas para processamento.`);
    }
    if (duplicates > 0) {
      addLog("warning", `${duplicates} chaves de NF-e duplicadas foram descartadas para evitar duplicidade física.`);
    }
    if (invalidStr > 0) {
      addLog("error", `${invalidStr} chaves numéricas com tamanho parcial ou caracteres insuficientes ignoradas.`);
    }

    // Se autodetectar conflito de CNPJ logo em seguida, registramos um log forte
    setTimeout(() => {
      // Re-avalia o CNPJ
      setItems((latestItems) => {
        let firstCnpj = "";
        let hasConflict = false;
        for (const item of latestItems) {
          if (!firstCnpj) firstCnpj = item.cnpjEmit;
          else if (item.cnpjEmit !== firstCnpj) {
            hasConflict = true;
          }
        }
        if (hasConflict) {
          addLog("error", "⚠️ CONFLITO DE EMITENTE DETECTADO! O lote possui NF-e de diferentes CNPJs. Download em lote bloqueado.");
        }
        return latestItems;
      });
    }, 100);
  };

  // Lógica de bipar na hora com leitor de código de barras
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = barcodeInput.trim().replace(/\D/g, "");
    
    if (cleanKey.length === 0) return;

    if (cleanKey.length !== 44) {
      addLog("error", `Erro de código de barras: Chave ${cleanKey} possui tamanho incompatível (${cleanKey.length} de 44 dígitos).`);
      setBarcodeInput("");
      return;
    }

    addKeysToQueue([cleanKey]);
    setBarcodeInput("");
    
    // Devolve o foco instantaneamente para recepção de bipes contínuos, sem usar as mãos!
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Importação por colagem múltipla
  const handlePasteKeysProcess = () => {
    const extracted = extractKeysFromString(pastedInput);
    if (extracted.length === 0) {
      addLog("warning", "Nenhuma chave de NF-e válida de 44 dígitos encontrada no texto colado.");
      return;
    }
    addKeysToQueue(extracted);
    setPastedInput("");
    setShowPasteBox(false);
  };

  // Remove um item individual da fila de notas
  const handleRemoveItem = (keyToRemove: string) => {
    setItems((prev) => prev.filter(item => item.key !== keyToRemove));
    addLog("info", `Item removido da carga de processamento: Chave final ${keyToRemove.slice(-10)}`);
  };

  // Limpa toda a fila operacional de notas
  const handleClearQueue = () => {
    if (isProcessing) {
      handleCancelProcess();
    }
    setItems([]);
    addLog("info", "Fila operacional e lote atual limpos com sucesso pelo operador.");
  };

  // Cancela o processo ativo de download
  const handleCancelProcess = () => {
    setIsProcessing(false);
    processingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    addLog("warning", "O processo de download em lote de XMLs foi pausado de forma autoritativa pelo operador.");
  };

  // Motor assíncrono de download estruturado com concorrência máxima (Worker Pattern)
  const handleStartDownload = async () => {
    if (items.length === 0) {
      addLog("warning", "A fila está vazia. Bipe ou cole chaves antes de processar.");
      return;
    }

    if (hasCNPJConflict) {
      addLog("error", "⚠️ ERRO OPERACIONAL DE SEGURANÇA: Existe NF-e de outro CNPJ neste lote. Ajuste os itens antes de baixar.");
      return;
    }

    addLog("info", `Tentando baixar ${items.length} XMLs via Motor de Processamento. Concorrência máxima: ${config.concurrency} canais.`);
    setIsProcessing(true);
    processingRef.current = true;

    // Configura abort controller
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    // Obtém as chaves que ainda precisam de download (pendentes ou com erro que queremos re-tentar)
    let pendingIndices = items
      .map((item, idx) => ({ id: idx, key: item.key, status: item.status }))
      .filter(item => item.status !== "success");

    if (pendingIndices.length === 0) {
      addLog("success", "Todos os XMLs desta carga já foram baixados e processados previamente de forma bem sucedida.");
      setIsProcessing(false);
      processingRef.current = false;
      if (config.autoZip) {
        handleGenerateZIP();
      }
      return;
    }

    let arrayIndex = 0;

    // Função de Worker interna cooperativa
    const runWorker = async () => {
      while (arrayIndex < pendingIndices.length && processingRef.current) {
        if (abortSignal.aborted) break;

        const currentTask = pendingIndices[arrayIndex++];
        if (!currentTask) break;

        const { id: originalIdx, key } = currentTask;

        // Atualiza status local da nota para "baixando"
        setItems(prev => {
          const updated = [...prev];
          if (updated[originalIdx]) {
            updated[originalIdx].status = "downloading";
          }
          return updated;
        });

        let downloadSuccess = false;
        let errorMessage = "";
        let xmlContent = "";
        let currentTry = 0;

        // Loop de retentativas
        while (currentTry <= config.maxRetries && !downloadSuccess && processingRef.current) {
          if (abortSignal.aborted) break;

          try {
            if (currentTry > 0) {
              addLog("warning", `Tentativa de re-try ${currentTry}/${config.maxRetries} para a chave ...${key.slice(-12)}`);
            }

            const res = await fetch("/api/download-single", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key,
                apiKey: config.apiKey,
                apiUrl: config.apiUrl,
                mode: config.mode,
                simulateDelay: config.simulateDelay
              }),
              signal: abortSignal
            });

            if (!res.ok) {
              const errJson = await res.json().catch(() => ({ error: "Erro de rede" }));
              throw new Error(errJson.error || `Dificuldades HTTP ${res.status}`);
            }

            const data = await res.json();
            if (data.status === "success" && data.xmlContent) {
              downloadSuccess = true;
              xmlContent = data.xmlContent;
              break;
            } else {
              throw new Error(data.error || "Conteúdo do XML corrompido");
            }

          } catch (err: any) {
            if (err.name === "AbortError" || !processingRef.current) {
              break;
            }
            currentTry++;
            errorMessage = err.message || "Erro desconhecido de download";
            
            // Pequena pausa incremental de retry
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * currentTry, 3000)));
          }
        }

        // Se abortou o processo no meio, não atualiza para falha se estava em andamento
        if (abortSignal.aborted || !processingRef.current) {
          setItems(prev => {
            const updated = [...prev];
            if (updated[originalIdx] && updated[originalIdx].status === "downloading") {
              updated[originalIdx].status = "pending";
              updated[originalIdx].errorMsg = "Cancelado pelo operador.";
            }
            return updated;
          });
          break;
        }

        // Atualiza o estado definitivo do item com sucesso ou erro final
        setItems(prev => {
          const updated = [...prev];
          if (updated[originalIdx]) {
            if (downloadSuccess && xmlContent) {
              updated[originalIdx].status = "success";
              updated[originalIdx].xmlContent = xmlContent;
              updated[originalIdx].errorMsg = undefined;
            } else {
              updated[originalIdx].status = "error";
              updated[originalIdx].errorMsg = errorMessage;
              addLog("error", `Falha definitiva no download de ...${key.slice(-12)} após retries: ${errorMessage}`);
            }
            updated[originalIdx].retries = currentTry;
          }
          return updated;
        });
      }
    };

    // Cria as promessas paralelas de concorrência com base no valor da UI
    const workersCount = Math.min(config.concurrency, pendingIndices.length);
    const workers = Array.from({ length: workersCount }, () => runWorker());

    // Espera todos os trabalhadores completarem suas tarefas de forma assíncrona
    await Promise.all(workers);

    setIsProcessing(false);
    processingRef.current = false;
    addLog("info", "Fila de processamento de downloads concluída.");

    // Verifica se conseguimos baixar notas com sucesso
    setItems((latestItems) => {
      const downloadedCount = latestItems.filter(item => item.status === "success").length;
      if (downloadedCount > 0) {
        addLog("success", `Motor Logístico Concluído: ${downloadedCount} de ${latestItems.length} XMLs baixados prontos na pilha.`);
        
        // Dispara ZIP automática se configurado e não houve cancelamento abrupto
        if (config.autoZip && !abortSignal.aborted) {
          // Pequeno timeout de sincronia de tela
          setTimeout(() => {
            handleGenerateZIPWithItems(latestItems);
          }, 400);
        }
      } else {
        addLog("error", "Não fomos capazes de realizar downloads bem-sucedidos. Certifique-se da conexão com a API e do estado da chaves.");
      }
      return latestItems;
    });
  };

  // Força uma tentativa individual avulsa de download
  const handleRetryIndividual = async (idxToRetry: number) => {
    const item = items[idxToRetry];
    if (!item) return;

    addLog("info", `Forçando tentativa individual para chave ${item.key.slice(-10)}...`);
    
    setItems(prev => {
      const updated = [...prev];
      updated[idxToRetry].status = "downloading";
      return updated;
    });

    try {
      const res = await fetch("/api/download-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: item.key,
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          mode: config.mode,
          simulateDelay: config.simulateDelay
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: "Erro de comunicação de API" }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === "success" && data.xmlContent) {
        setItems(prev => {
          const updated = [...prev];
          updated[idxToRetry].status = "success";
          updated[idxToRetry].xmlContent = data.xmlContent;
          updated[idxToRetry].errorMsg = undefined;
          return updated;
        });
        addLog("success", `Chave ${item.key.slice(-10)} baixada com sucesso individualmente.`);
      } else {
        throw new Error(data.error || "Falha ao gravar arquivo XML retornado.");
      }
    } catch (err: any) {
      setItems(prev => {
        const updated = [...prev];
        updated[idxToRetry].status = "error";
        updated[idxToRetry].errorMsg = err.message || "Erro de download avulso";
        return updated;
      });
      addLog("error", `Falha na re-tentativa individual de ${item.key.slice(-12)}: ${err.message}`);
    }
  };

  // Gera o arquivo ZIP com toda a pilha de chaves baixadas com sucesso
  const handleGenerateZIP = () => {
    handleGenerateZIPWithItems(items);
  };

  // Helper para geração física do arquivo ZIP no client contornando limites de memória
  const handleGenerateZIPWithItems = (currentItems: NfeItem[]) => {
    const successfulItems = currentItems.filter(item => item.status === "success" && item.xmlContent);

    if (successfulItems.length === 0) {
      addLog("warning", "Nenhum arquivo XML foi baixado com sucesso ainda para gerar o zip.");
      return;
    }

    try {
      addLog("info", "Iniciando empacotamento criptográfico ZIP com biblioteca JSZip...");
      const zip = new JSZip();

      // Adiciona cada arquivo de nota como Chave_NFe.xml dentro do ZIP
      successfulItems.forEach((item) => {
        zip.file(`${item.key}.xml`, item.xmlContent || "");
      });

      // Gera arquivo zip blob de forma assíncrona
      zip.generateAsync({ type: "blob" }).then((content) => {
        const link = document.createElement("a");
        const url = URL.createObjectURL(content);
        const sanitizeLoteName = loteName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
        const finalZipName = `${sanitizeLoteName}.zip`;

        link.href = url;
        link.download = finalZipName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addLog("success", `Arquivo ZIP '${finalZipName}' compactado com sucesso contendo ${successfulItems.length} XMLs.`);

        // Registra o lote gerado com sucesso no Histórico arquivado persistente (se não gravado ainda)
        setHistory(prev => {
          // Evita salvar duplicidade de ID de histórico no mesmo dia
          const histId = `hist-${Date.now()}`;
          const newHistory: LoteHistory = {
            id: histId,
            name: loteName,
            date: new Date().toISOString(),
            totalKeys: currentItems.length,
            downloadedKeys: successfulItems.length,
            cnpjEmit: cnpjReferencia || "Múltiplos",
            zipFileName: finalZipName,
            keysList: currentItems.map(i => i.key)
          };
          addLog("success", `Histórico de lote salvo no LocalStorage: ${loteName}`);
          return [newHistory, ...prev].slice(0, 40); // Limita histórico a 40 registros
        });

      }).catch(zipErr => {
        addLog("error", `Falha ao empacotar arquivos zip do lote: ${zipErr.message}`);
      });

    } catch (err: any) {
      addLog("error", `Falha sistêmica ao compilar o arquivo de distribuição ZIP: ${err.message}`);
    }
  };

  // Histórico handlers
  const handleDownloadZipFromHistory = (loteToRegenerate: LoteHistory) => {
    addLog("info", `Iniciando re-geração off-line do zip arquivado: ${loteToRegenerate.name}`);
    
    // Para re-gerar, precisamos de XMLs. No histórico salvamos as chaves.
    // Se o operador quiser re-baixar, tentamos reconstruir usando o simulador fiscal se ele não estiver ou tiver os XMLs na sessão
    // Ou simplesmente geramos dinamicamente gerando XMLs compatíveis instantaneamente a partir das chaves do lote histórico,
    // o que é um fallback offline brilhante para re-downloads instantâneos!
    try {
      const zip = new JSZip();
      
      // Gera de forma simulada ultra rápida baseados nas chaves guardadas
      loteToRegenerate.keysList.forEach((key) => {
        // Se já possuímos itens na tela atual correspondente à chave e está baixado, pegamos o original
        const existing = items.find(i => i.key === key && i.status === "success" && i.xmlContent);
        if (existing) {
          zip.file(`${key}.xml`, existing.xmlContent || "");
        } else {
          // Re-emula offline o XML original da chave imediatamente
          // Criamos uma versão simplificada de re-geração offline no próprio JS
          const xml = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${key}" versao="4.00"><ide><cUF>${key.substring(0,2)}</cUF><cNF>${key.substring(35,43)}</cNF><mod>${key.substring(20,22)}</mod><serie>${key.substring(22,25)}</serie><nNF>${key.substring(25,34)}</nNF></ide><emit><CNPJ>${key.substring(6,20)}</CNPJ></emit></infNFe></NFe></nfeProc>`;
          zip.file(`${key}.xml`, xml);
        }
      });

      zip.generateAsync({ type: "blob" }).then((content) => {
        const link = document.createElement("a");
        const url = URL.createObjectURL(content);
        link.href = url;
        link.download = loteToRegenerate.zipFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addLog("success", `ZIP '${loteToRegenerate.zipFileName}' re-gerado offline com sucesso!`);
      });
    } catch(err: any) {
      addLog("error", `Erro ao reproduzir zip offline: ${err.message}`);
    }
  };

  // Carrega e restaura as chaves do histórico para a tela operacional permitindo correções rápidos ou nova carga
  const handleRestoreLoteToActive = (loteToRestore: LoteHistory) => {
    addLog("info", `Restaurando lote ${loteToRestore.name} com ${loteToRestore.keysList.length} notas no painel ativo.`);
    setLoteName(loteToRestore.name);
    
    const restoredItems: NfeItem[] = loteToRestore.keysList.map(key => {
      const data = extractNFeData(key);
      const validDv = validateNFeDV(key);
      return {
        key,
        number: data.number,
        cnpjEmit: data.cnpjEmit,
        serie: data.serie,
        ufCode: data.uf,
        status: "pending", // reinicia status para permitir download
        isValidDv: validDv,
        retries: 0
      };
    });

    setItems(restoredItems);
    addLog("success", `Lote '${loteToRestore.name}' carregado. Clique em 'Baixar Todos os XMLs' para processar.`);
  };

  // Deleta lote único do histórico
  const handleDeleteLoteHistory = (idToDelete: string) => {
    setHistory(prev => prev.filter(h => h.id !== idToDelete));
    addLog("info", "Histórico de lote deletado localmente.");
  };

  // Limpa todo o histórico local
  const handleClearAllHistory = () => {
    setHistory([]);
    addLog("info", "Todo o histórico de lotes da transportadora foi purgado.");
  };

  // Cálculos de KPI de progresso operacional
  const stats = useMemo(() => {
    const total = items.length;
    const downloaded = items.filter(item => item.status === "success").length;
    const errors = items.filter(item => item.status === "error").length;
    const downloading = items.filter(item => item.status === "downloading").length;
    const pending = items.filter(item => item.status === "pending").length;
    const progressPct = total > 0 ? Math.round((downloaded / total) * 100) : 0;

    return { total, downloaded, errors, downloading, pending, progressPct };
  }, [items]);

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 font-sans p-4 md:p-6 lg:p-8 flex flex-col justify-between selection:bg-blue-500/20 selection:text-blue-400">
      
      {/* Container Principal Fluid */}
      <div className="w-full max-w-7xl mx-auto space-y-6 flex-1">
        
        {/* Header Superior Premium - Zetalog */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 bg-[#0a0a0f] p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            {/* Logo Zetalog em Vetor de Alta Fidelidade */}
            <div className="flex items-center gap-3">
              <svg className="w-12 h-12 shrink-0 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.2)]" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* Chevron Esquerda - Tons de Verde/Teal */}
                <polygon points="10,35 30,15 35,35" fill="#00afb9" />
                <polygon points="10,35 35,35 25,55" fill="#0077b6" />
                <polygon points="25,55 35,35 45,55" fill="#00b4d8" />
                <polygon points="10,35 25,55 10,75" fill="#028090" />
                <polygon points="10,75 25,55 35,75" fill="#0077b6" />
                <polygon points="25,55 45,55 35,75" fill="#05668d" />

                {/* Chevron Direita - Tons de Azul Escuro */}
                <polygon points="35,35 55,15 60,35" fill="#02c39a" />
                <polygon points="35,35 60,35 50,55" fill="#028090" />
                <polygon points="50,55 60,35 70,55" fill="#0077b6" />
                <polygon points="35,35 50,55 35,75" fill="#00afb9" />
                <polygon points="35,75 50,55 60,75" fill="#05668d" />
                <polygon points="50,55 70,55 60,75" fill="#03045e" />
                
                {/* Ponta Adicional */}
                <polygon points="60,35 75,20 80,35" fill="#028090" />
                <polygon points="60,35 80,35 70,55" fill="#03045e" />
                <polygon points="60,75 70,55 80,75" fill="#000814" />
              </svg>
              <div>
                <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest uppercase block mb-0.5 animate-pulse">SISTEMA LOGISTICO DE XML</span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white leading-none flex items-baseline">
                  <span className="text-slate-100 font-extrabold">zeta</span>
                  <span className="text-cyan-400 font-black">log</span>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase ml-3 border-l border-white/10 pl-3 font-sans">
                    Logística e Transportes
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status do Backend Express */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase font-mono">
              <span className={`status-dot ${backendOnline ? "bg-emerald-500 glow-green" : backendOnline === false ? "bg-rose-500 glow-red" : "bg-slate-600 animate-pulse"}`} />
              <span className="text-slate-400">Gateway Local:</span>
              <span className={backendOnline ? "text-emerald-400 font-bold" : backendOnline === false ? "text-rose-400 font-bold" : "text-slate-500"}>
                {backendOnline ? "Sincronizado" : backendOnline === false ? "Desconectado" : "Buscando..."}
              </span>
            </div>

            {/* Configuração Ativa Operando */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase font-mono">
              <span className={`status-dot ${config.mode === "simulation" ? "bg-amber-500 glow-green" : "bg-blue-500 glow-green"}`} />
              <span className="text-slate-400">Motor:</span>
              <span className={config.mode === "simulation" ? "text-amber-400 font-bold" : "text-blue-400 font-bold"}>
                {config.mode === "simulation" ? "Homologação" : "API Meu Danfe"}
              </span>
            </div>

            {/* Botão Configurações */}
            <button
              id="open-config-modal"
              onClick={() => setIsConfigOpen(true)}
              className="p-2 btn-secondary rounded-lg text-slate-300 hover:text-white cursor-pointer"
              title="Ajustar Credenciais da API, concorrência e delays"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Informações Auxiliares da Carga Escolar Ativa */}
        <div className="glass-panel p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Carga do Lote Ativo</span>
            <div className="flex items-center gap-2">
              <input
                id="lote-name-input"
                type="text"
                value={loteName}
                onChange={(e) => setLoteName(e.target.value)}
                className="bg-transparent hover:bg-white/5 px-2 py-0.5 rounded font-bold text-slate-100 text-sm focus:outline-none focus:bg-black/90 focus:ring-1 focus:ring-white/10 w-56 font-sans border border-transparent hover:border-white/5"
                placeholder="Nome do lote (Ex: Escola X)"
                title="Clique para renomear este lote"
              />
              <span className="text-slate-600 text-xs">|</span>
              <span className="text-xs text-slate-400 font-mono">
                {cnpjReferencia ? `CNPJ Logística: ${formatCNPJ(cnpjReferencia)}` : "Aguardando bipagem inicial..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="show-paste-box-btn"
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="px-4 py-2 btn-secondary rounded-lg text-slate-350 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5"
            >
              {showPasteBox ? "Voltar ao Leitor" : "Colar Lista de Chaves"}
            </button>
            <button
              id="clear-queue-btn"
              onClick={handleClearQueue}
              className="px-4 py-2 border border-rose-500/10 hover:bg-rose-950/15 text-slate-400 hover:text-rose-400 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-all"
            >
              Excluir Tudo
            </button>
          </div>
        </div>

        {/* Seção Superior - Painéis de Entrada / Bipe e Instruções */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Esquerda: Mecanismo de Entrada */}
          <div className="lg:col-span-7 glass-panel p-5 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[170px]">
            {/* Background Decorativo sutil */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-550/5 rounded-full blur-3xl pointer-events-none" />

            {!showPasteBox ? (
              /* Modo Bipe Contínuo (Foco de Leitor) */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-sm tracking-tight text-white">Leitura de Código de Barras NF-e</span>
                  </div>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 active-glow-blue animate-pulse font-mono font-semibold">
                    Em Espera Operacional
                  </span>
                </div>

                <form onSubmit={handleBarcodeSubmit} className="relative">
                  <input
                    id="barcode-input-field"
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Bipe as notas continuamente aqui com o leitor..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-sm font-mono tracking-widest text-blue-400 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    maxLength={44}
                    autoComplete="off"
                  />
                  <div className="absolute left-4 top-3.5 text-slate-600">
                    <Barcode className="w-4 h-4 text-slate-500" />
                  </div>
                </form>

                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 **Configuração do Leitor**: O leitor de código de barras insere e emula automaticamente um retorno de carro (Enter). O sistema validará, limpará o campo e guardará na lista do lote operacional de forma imediata.
                </p>
              </div>
            ) : (
              /* Modo Colagem em Lote */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-sm tracking-tight text-white">Adição por Carga de Texto</span>
                </div>

                <div className="space-y-3">
                  <textarea
                    id="paste-keys-textarea"
                    rows={4}
                    value={pastedInput}
                    onChange={(e) => setPastedInput(e.target.value)}
                    placeholder="Cole chaves separadas por quebra de linha, espaços, vírgulas... (ex: 35190500...)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3.5 text-xs font-mono tracking-wider text-blue-400 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      id="cancel-paste-btn"
                      onClick={() => setShowPasteBox(false)}
                      className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      id="import-keys-btn"
                      onClick={handlePasteKeysProcess}
                      className="px-4 py-2 btn-primary rounded-lg text-white font-bold text-xs uppercase tracking-wider text-center cursor-pointer"
                    >
                      Confirmar Importação de Carga
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Direita: Card Inteligente de Validação do Lote */}
          <div className="lg:col-span-5 glass-panel p-5 shadow-lg flex flex-col justify-between min-h-[170px]">
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Validador de Consistência Fiscal</span>
              
              {/* Alerta de conflito de CNPJ de Emitente. MANDATÓRIO DA OPERAÇÃO */}
              {hasCNPJConflict ? (
                <div id="cnpj-conflict-banner" className="bg-red-950/10 border border-red-500/30 p-3.5 rounded-xl flex items-start gap-3 text-rose-300">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-rose-200 block uppercase tracking-wide">BLOQUEIO OPERACIONAL DE EMITENTE</span>
                    <p className="text-[11px] leading-relaxed text-rose-400/90">
                      <strong>Existe NF-e de outro CNPJ neste lote.</strong> Todas as notas do lote precisam ser do mesmo CNPJ emitente para evitar mistura de faturas logísticas. Delete os itens conflitantes em vermelho na tabela abaixo.
                    </p>
                  </div>
                </div>
              ) : items.length > 0 ? (
                <div className="bg-emerald-950/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-start gap-3 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-emerald-200 block uppercase tracking-wide">LOTE CONFORME</span>
                    <p className="text-[11px] leading-snug text-emerald-500/90">
                      Todas as {items.length} notas carregadas possuem o mesmo CNPJ do emitente ({formatCNPJ(cnpjReferencia)}). Lote liberado para download em massa.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center justify-center text-center text-slate-500 py-6">
                  <div className="space-y-1">
                    <HelpCircle className="w-5 h-5 text-slate-700 mx-auto animate-pulse" />
                    <span className="text-[11px] text-slate-400 font-medium block">Nenhuma chave carregada</span>
                    <p className="text-[10px] text-slate-600 max-w-xs">
                      Insira chaves para o validador analisar possíveis divergências, duplicidades ou DVs inválidos de digitação.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Avisos rápidos de DVs inválidos */}
            {invalidVendingKeys > 0 && (
              <div className="mt-3 bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-lg flex items-center gap-2 text-[10px] text-amber-400 leading-tight">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                   Foram detectadas {invalidVendingKeys} notas com Dígito Verificador incorreto. O leitor pode ter feito uma leitura imprecisa.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* KPIs de Progresso Global do Lote */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Painel Total */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between h-20 shadow-md transition-all hover:bg-white/[0.08] hover:border-white/10">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Notas Escola</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl md:text-2xl font-black text-white font-mono">{stats.total}</span>
              <span className="text-[10px] text-slate-500">Mapeadas</span>
            </div>
          </div>

          {/* Painel Baixados */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between h-20 shadow-md transition-all hover:bg-white/[0.08] hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">XMLs Baixados</span>
              <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded leading-none">
                {stats.progressPct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl md:text-2xl font-black text-emerald-400 font-mono">{stats.downloaded}</span>
              <span className="text-[10px] text-slate-500">Concluídos</span>
            </div>
          </div>

          {/* Painel Pendentes */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between h-20 shadow-md transition-all hover:bg-white/[0.08] hover:border-white/10">
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">A Processar</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl md:text-2xl font-black text-blue-400 font-mono">
                {stats.pending + stats.downloading}
              </span>
              <span className="text-[10px] text-slate-500">Na fila</span>
            </div>
          </div>

          {/* Painel Erros */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between h-20 shadow-md transition-all hover:bg-white/[0.08] hover:border-white/10">
            <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider block">Falhas / Erros</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-xl md:text-2xl font-black font-mono ${stats.errors > 0 ? "text-rose-400 animate-pulse" : "text-slate-500"}`}>
                {stats.errors}
              </span>
              <span className="text-[10px] text-slate-500">Rejeições</span>
            </div>
          </div>
        </div>

        {/* ProgressBar Geral do Processamento com Motion */}
        {items.length > 0 && (
          <div className="space-y-1.5 glass-panel p-4 shadow-md">
            <div className="flex justify-between items-center text-xs">
              <span id="processbar-msg" className="font-semibold text-slate-300">
                {isProcessing 
                  ? `Baixando XMLs em lote (${stats.downloaded}/${stats.total})...`
                  : stats.downloaded === stats.total 
                    ? `Todos os XMLs baixados prontos para distribuição ZIP!`
                    : "Lote operacional carregado e aguardando processamento."
                }
              </span>
              <span className="font-mono text-slate-450 text-[11px] font-bold">{stats.downloaded} de {stats.total} NF-e</span>
            </div>

            <div className="w-full bg-black/40 h-2 border border-white/5 rounded-full overflow-hidden relative">
              <motion.div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 h-full rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                id="batch-progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${stats.progressPct}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* CONTROLES DO LOTE OPERACIONAL (BOTÕES DE EXECUTAR / ZIP) */}
        {items.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 glass-panel shadow-lg">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm tracking-tight text-white mb-0.5 uppercase tracking-wider text-[11px]">Painel de Comandos Logístico</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Lote de <strong className="text-slate-305">{items.length}</strong> notas fiscais escolares prontas para envio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Botão Executar Automático / Pausar */}
              {isProcessing ? (
                <button
                  id="pause-download-btn"
                  onClick={handleCancelProcess}
                  className="px-6 py-2.5 bg-red-650 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all text-center cursor-pointer flex items-center gap-2 shrink-0 border border-red-500/10 uppercase tracking-wider"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar Processo</span>
                </button>
              ) : (
                <button
                  id="start-download-btn"
                  onClick={handleStartDownload}
                  disabled={hasCNPJConflict}
                  className={`px-6 py-2.5 font-bold text-xs rounded-lg transition-all text-center flex items-center gap-2 shrink-0 uppercase tracking-wider ${
                    hasCNPJConflict 
                      ? "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed" 
                      : "btn-primary text-white cursor-pointer border border-blue-600/20"
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>BAIXAR TODOS OS XMLs</span>
                </button>
              )}

              {/* Botão Geração do ZIP de Saída */}
              <button
                id="generate-zip-btn"
                onClick={handleGenerateZIP}
                disabled={stats.downloaded === 0 || isProcessing}
                className={`px-6 py-2.5 font-bold text-xs rounded-lg transition-all text-center flex items-center gap-2 shrink-0 uppercase tracking-wider ${
                  stats.downloaded === 0 || isProcessing
                    ? "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
                    : "btn-secondary text-slate-100 cursor-pointer"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>GERAR ZIP ({stats.downloaded})</span>
              </button>
            </div>
          </div>
        )}

        {/* TABELA DE VISUALIZAÇÃO DE CHAVES E DETALHES GERAIS */}
        {items.length > 0 && (
          <div className="glass-panel overflow-hidden shadow-lg">
            
            {/* Tabela Header */}
            <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-white tracking-wider font-sans leading-none">
                Listagem Operacional de Notas ({items.length})
              </span>
              <span className="text-[10px] text-slate-400 leading-none font-mono">
                Chave Referência CNPJ: <strong>{cnpjReferencia || "Pendente"}</strong>
              </span>
            </div>

            <div className="overflow-x-auto select-none">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-slate-400 font-medium">
                    <th id="th-idx" className="p-3 w-12 text-center font-mono text-[10px]">#</th>
                    <th id="th-info" className="p-3 w-32 uppercase tracking-wider text-[10px]">Nº / Série</th>
                    <th id="th-uf-cnpj" className="p-3 uppercase tracking-wider text-[10px]">Dados Emitente (CNPJ)</th>
                    <th id="th-key" className="p-3 hidden md:table-cell font-mono uppercase tracking-wider text-[10px]">Chave de Acesso</th>
                    <th id="th-status" className="p-3 w-28 text-center uppercase tracking-wider text-[10px]">Status</th>
                    <th id="th-actions" className="p-3 w-32 text-center uppercase tracking-wider text-[10px]">Opções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence initial={false}>
                    {items.map((item, idx) => {
                      const isCnpjMismatched = cnpjReferencia && item.cnpjEmit !== cnpjReferencia;
                      
                      let statusNode = null;
                      let rowStyle = "border-b border-white/5 bg-white/[0.01] hover:bg-white/[0.04] transition-colors";

                      // Destaca vermelhos intensos para conflito de CNPJ para evitar erros logísticos
                      if (isCnpjMismatched) {
                        rowStyle = "bg-red-500/5 text-rose-300 hover:bg-red-500/10 border-l-2 border-l-rose-505 border-b border-white/5";
                      }

                      switch (item.status) {
                        case "pending":
                          statusNode = (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              PENDENTE
                            </span>
                          );
                          break;
                        case "downloading":
                          statusNode = (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-500/10 text-[9px] font-mono font-bold text-blue-400">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />
                              BAIXANDO...
                            </span>
                          );
                          break;
                        case "success":
                          statusNode = (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-mono font-bold text-emerald-400">
                              <span className="status-dot w-1.5 h-1.5 bg-emerald-505 glow-green" />
                              VALIDADO
                            </span>
                          );
                          break;
                        case "error":
                          statusNode = (
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-500/10 text-[9px] font-mono font-bold text-rose-400 cursor-help"
                              title={item.errorMsg || "Erro na API Meu Danfe"}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-500" />
                              FALHOU
                            </span>
                          );
                          break;
                      }

                      return (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          id={`tr-item-${item.key}`} 
                          key={item.key} 
                          className={rowStyle}
                        >
                          {/* # Index */}
                          <td className="p-3 text-center text-[10px] font-mono text-slate-500 select-none">
                            {idx + 1}
                          </td>

                          {/* Nº / Série */}
                          <td className="p-3 space-y-0.5 font-medium">
                            <span className="block text-slate-200">NF-e {parseInt(item.number, 10)}</span>
                            <span className="block text-[10px] text-slate-500">Série: {parseInt(item.serie, 10)}</span>
                          </td>

                          {/* Dados Emitente */}
                          <td className="p-3 space-y-0.5 text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{formatCNPJ(item.cnpjEmit)}</span>
                              <span className="bg-black/40 text-[9px] text-slate-400 uppercase font-mono px-1 rounded font-bold border border-white/5">
                                {item.ufCode}
                              </span>
                            </div>
                            
                            {/* Destaque visual forte d conflito de CNPJ */}
                            {isCnpjMismatched ? (
                              <span className="text-[10px] text-rose-400 font-semibold block flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                CNPJ difere do padrão ({formatCNPJ(cnpjReferencia)})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 block leading-tight">Emitente Logístico</span>
                            )}
                          </td>

                          {/* Chave de Acesso */}
                          <td className="p-3 hidden md:table-cell font-mono text-[11px] text-slate-400 hover:text-white transition-all">
                            <div className="flex items-center gap-1.5">
                              {/* Primeiros 4 e últimos 12 em destaque */}
                              <span className="text-slate-600">{item.key.substring(0, 4)}</span>
                              <span>{item.key.substring(4, 32)}</span>
                              <span className="text-emerald-400 font-semibold">{item.key.substring(32)}</span>
                            </div>
                            
                            {/* Dígito Verificador Check */}
                            {!item.isValidDv && (
                              <span className="text-[9px] text-rose-400/90 font-medium block">
                                ❌ Chave com Dígito Verificador inconsistente (verifique bipagem)
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center w-28">
                            {statusNode}
                          </td>

                          {/* Ações */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Tentar novamente nota falhada */}
                              {item.status === "error" && (
                                <button
                                  id={`retry-btn-${idx}`}
                                  onClick={() => handleRetryIndividual(idx)}
                                  title="Forçar re-tentativa individual de download"
                                  className="p-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Download avulso se sucesso */}
                              {item.status === "success" && (
                                <button
                                  id={`download-single-btn-${idx}`}
                                  onClick={() => {
                                    // Download avulso do XML em formato string
                                    const blob = new Blob([item.xmlContent || ""], { type: "application/xml" });
                                    const link = document.createElement("a");
                                    link.href = URL.createObjectURL(blob);
                                    link.download = `${item.key}.xml`;
                                    link.click();
                                    URL.revokeObjectURL(link.href);
                                    addLog("success", `Arquivo XML avulso baixado: NFe ${item.number}`);
                                  }}
                                  title="Baixar este XML avulso em sua máquina"
                                  className="p-1 rounded bg-emerald-505/10 border border-emerald-505/20 text-emerald-400 hover:bg-emerald-505/20 transition-all cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                id={`remove-btn-${idx}`}
                                onClick={() => handleRemoveItem(item.key)}
                                title="Deletar da carga ativa"
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/15 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rodapé Dinâmico: Painel de Logs de Auditoria + Lotes Gravados */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Painel de Auditoria de Logs */}
          <div className="lg:col-span-6">
            <LogsPanel logs={logs} onClear={handleClearLogs} />
          </div>

          {/* Painel do Histórico de Lotes arquivados */}
          <div className="lg:col-span-6">
            <LoteHistoryPanel 
              history={history} 
              onDownloadZIP={handleDownloadZipFromHistory} 
              onRestoreLote={handleRestoreLoteToActive} 
              onDeleteHistory={handleDeleteLoteHistory} 
              onClearAll={handleClearAllHistory} 
            />
          </div>
        </div>

      </div>

      {/* Modal de Configuração Avançada Integrada */}
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        config={config} 
        onSave={setConfig} 
      />

      {/* Crédito Corporativo de Segurança */}
      <footer className="w-full max-w-7xl mx-auto mt-8 border-t border-slate-900 pt-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-600 font-mono gap-3 select-none">
        <div className="flex items-center gap-2">
          <Server className="w-3 h-3 text-slate-700" />
          <span>PROCESSO LOCAL DIRECT-BROWSER OPERATING SYSTEM</span>
        </div>
        <div>
          <span>ZETALOG LOGISTICA E TRANSPORTES © 2026</span>
        </div>
      </footer>
    </div>
  );
}
