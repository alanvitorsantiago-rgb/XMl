import React, { useState } from "react";
import { X, Settings, Database, Sliders, ShieldCheck, Info, RefreshCw } from "lucide-react";
import { SystemConfig } from "../types";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onSave: (newConfig: SystemConfig) => void;
}

export default function ConfigModal({ isOpen, onClose, config, onSave }: ConfigModalProps) {
  const [mode, setMode] = useState<"real" | "simulation">(config.mode);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [concurrency, setConcurrency] = useState(config.concurrency);
  const [maxRetries, setMaxRetries] = useState(config.maxRetries);
  const [simulateDelay, setSimulateDelay] = useState(config.simulateDelay);
  const [autoZip, setAutoZip] = useState(config.autoZip);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      mode,
      apiKey,
      apiUrl,
      concurrency,
      maxRetries,
      simulateDelay,
      autoZip
    });
    onClose();
  };

  return (
    <div id="modal-container" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all duration-300">
      <div 
        id="modal-card" 
        className="w-full max-w-xl glass-panel shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0f]/80">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="font-semibold tracking-tight text-white uppercase tracking-wider text-xs">Configurações do Mecanismo de Automação</span>
          </div>
          <button 
            id="close-config-btn"
            onClick={onClose} 
            className="p-1.5 rounded-lg btn-secondary text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Engine Mode */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-500" /> Modo de Operação do Motor
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("simulation")}
                className={`py-3 px-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-24 cursor-pointer ${
                  mode === "simulation"
                    ? "bg-emerald-500/10 border-emerald-505/30 text-emerald-250 shadow-inner"
                    : "bg-black/30 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-semibold text-xs uppercase tracking-wider text-slate-200">Modo Homologação</span>
                  <span className={`status-dot w-2 h-2 ${mode === "simulation" ? "bg-emerald-550 glow-green animate-pulse" : "bg-slate-650"}`} />
                </div>
                <p className="text-[11px] leading-snug text-slate-400 font-sans">
                  Simulador fiscal de alta vazão. Gera XMLs realistas do zero. Para testes logísticos volumosos.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("real")}
                className={`py-3 px-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-24 cursor-pointer ${
                  mode === "real"
                    ? "bg-blue-500/10 border-blue-550/30 text-blue-250 shadow-inner"
                    : "bg-black/30 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-semibold text-xs uppercase tracking-wider text-slate-200">Modo Integração API</span>
                  <span className={`status-dot w-2 h-2 ${mode === "real" ? "bg-blue-550 glow-green animate-pulse" : "bg-slate-650"}`} />
                </div>
                <p className="text-[11px] leading-snug text-slate-400 font-sans">
                  Baixa XMLs oficiais de canais reais usando a API configurada do Meu Danfe. Requer chave.
                </p>
              </button>
            </div>
          </div>

          {/* API Credentials */}
          {mode === "real" ? (
            <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/10 animate-fadeIn text-sm">
              <h4 className="text-[10px] uppercase font-semibold text-blue-400 tracking-wider flex items-center gap-1.5 font-mono">
                <Database className="w-3.5 h-3.5" /> Credenciais Meu Danfe
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Chave da API / Token de Integração</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Cole aqui seu Token Oficial do Meu Danfe..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Este token é usado nos cabeçalhos como chave Bearer ou X-API-Key.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Endpoint da API do Meu Danfe</label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.meudanfe.com.br/v1/xml"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500/50 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-500/20 flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-emerald-400 block h-4 uppercase tracking-wider text-[10px]">Simulação Logística Pronta para Emulação</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  O Modo Homologação é 100% livre de custos e limites. Cada chave bipada irá gerar arquivos estruturados simulados com os CNPJs e dados exatos contidos na chave! Ideal para avaliar o sistema com leituras em massa de 50 a 300 notas sem consumir créditos.
                </p>
              </div>
            </div>
          )}

          {/* Queues and Concurrency Parameters */}
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Desempenho e Resiliência
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs text-slate-400 font-medium">Threads de Download Simultâneo</label>
                <select
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-slate-100 cursor-pointer focus:outline-none focus:border-blue-500/50"
                >
                  <option value={1}>1 Conexão (Sequencial)</option>
                  <option value={3}>3 Conexões (Seguro)</option>
                  <option value={5}>5 Conexões (Recomendado)</option>
                  <option value={10}>10 Conexões (Massa)</option>
                  <option value={20}>20 Conexões (Velocidade Máxima)</option>
                </select>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  Evita bloqueios de taxa de requisição do Meu Danfe.
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-slate-400 font-medium">Auto-Tentar em Caso de Falha</label>
                <select
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value, 10))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-slate-100 cursor-pointer focus:outline-none focus:border-blue-500/50"
                >
                  <option value={0}>Nenhum retry (Falha direta)</option>
                  <option value={1}>1 tentativa de retry</option>
                  <option value={3}>3 tentativas (Recomendado)</option>
                  <option value={5}>5 tentativas (Segurança extra)</option>
                </select>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  Retenta downloads automaticamente em timeouts ou erros de gateway.
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2 font-sans">
              <label id="sim-delay-wrapper" className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5 cursor-pointer hover:bg-black/40 transition-colors">
                <input
                  type="checkbox"
                  checked={simulateDelay}
                  onChange={(e) => setSimulateDelay(e.target.checked)}
                  className="w-4 h-4 text-blue-500 focus:ring-black border-white/10 bg-black rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">Adicionar Latência de Rede Simulada</span>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Simula um delay realista de 200ms a 600ms para visualizar a barra de progresso em tempo real no Modo Homologação.
                  </p>
                </div>
              </label>

              <label id="auto-zip-wrapper" className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5 cursor-pointer hover:bg-black/40 transition-colors">
                <input
                  type="checkbox"
                  checked={autoZip}
                  onChange={(e) => setAutoZip(e.target.checked)}
                  className="w-4 h-4 text-blue-500 focus:ring-black border-white/10 bg-black rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">Compactação ZIP Automática</span>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Inicia automaticamente a geração e download do arquivo `.zip` assim que todas as chaves do lote forem concluídas com sucesso.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 btn-secondary rounded-lg text-slate-300 font-bold uppercase tracking-wider text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 btn-primary rounded-lg text-white font-bold uppercase tracking-wider text-xs cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
