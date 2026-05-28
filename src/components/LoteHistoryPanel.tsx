import { Archive, Download, FileJson, Trash2, Calendar, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { LoteHistory } from "../types";
import { formatCNPJ } from "../utils/nfe";

interface LoteHistoryPanelProps {
  history: LoteHistory[];
  onDownloadZIP: (lote: LoteHistory) => void;
  onRestoreLote: (lote: LoteHistory) => void;
  onDeleteHistory: (id: string) => void;
  onClearAll: () => void;
}

export default function LoteHistoryPanel({ 
  history, 
  onDownloadZIP, 
  onRestoreLote, 
  onDeleteHistory, 
  onClearAll 
}: LoteHistoryPanelProps) {
  
  return (
    <div className="glass-panel p-5 text-slate-105 flex flex-col space-y-4 h-full shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-white uppercase tracking-wider text-[11px]">Histórico de Lotes Logísticos</h3>
            <p className="text-[10px] text-slate-500">Histórico local armazenado de forma persistente no navegador</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            id="clear-all-history-btn"
            onClick={onClearAll}
            className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors py-1 px-2 hover:bg-white/5 rounded cursor-pointer border border-transparent hover:border-white/5"
          >
            Limpar tudo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px]">
        {history.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-605 space-y-2">
            <Archive className="w-8 h-8 text-slate-800 animate-pulse" />
            <div className="space-y-0.5">
              <span className="font-medium text-xs text-slate-500 block">Nenhum lote arquivado</span>
              <span className="text-[10px] text-slate-605 block">Complete o download de um lote para guardá-lo aqui</span>
            </div>
          </div>
        ) : (
          history.map((lote) => {
            return (
              <div 
                id={`lote-hist-${lote.id}`} 
                key={lote.id} 
                className="bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Lote Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-blue-400 font-sans tracking-wide">
                      {lote.name}
                    </span>
                    <span className="bg-black/40 border border-white/5 text-[9px] font-mono text-slate-400 px-2 py-0.5 rounded">
                      Emitente: {formatCNPJ(lote.cnpjEmit) || "Múltiplos"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(lote.date).toLocaleString("pt-BR")}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> {lote.downloadedKeys} XMLs salvos
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end self-end md:self-center">
                  <button
                    id={`restore-lote-${lote.id}`}
                    onClick={() => onRestoreLote(lote)}
                    title="Restaurar este lote para a fila atual de edição"
                    className="p-2 btn-secondary text-teal-400 hover:text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Carregar</span>
                  </button>

                  <button
                    id={`download-zip-hist-${lote.id}`}
                    onClick={() => onDownloadZIP(lote)}
                    title="Ver ou re-gerar ZIP offline com esses XMLs"
                    className="p-2 btn-secondary text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar ZIP</span>
                  </button>

                  <button
                    id={`delete-hist-${lote.id}`}
                    onClick={() => onDeleteHistory(lote.id)}
                    title="Excluir do histórico"
                    className="p-2 btn-secondary text-slate-500 hover:text-rose-400 hover:border-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
