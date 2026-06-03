import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "online",
    message: "Servidor de Automação Logística de XML NF-e ativo",
    timestamp: new Date().toISOString()
  });
}
