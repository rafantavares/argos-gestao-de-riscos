import { useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Divider, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { riscos as servicoRiscos } from "../services/api";
import { useAviso, useConfirmacao } from "../contexts/FeedbackContext";

const LIMITE_BYTES = 5 * 1024 * 1024;

function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Evidências do risco (atas, prints, e-mails, relatórios): sustentam o
// monitoramento e a comunicação às partes interessadas (MR-MPS-SW:2023, GPR 17).
export default function AnexosRisco({ idRisco }) {
  const [anexos, setAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const entradaRef = useRef(null);
  const avisar = useAviso();
  const confirmar = useConfirmacao();

  useEffect(() => {
    servicoRiscos.anexos(idRisco).then(setAnexos).catch(() => setAnexos([]));
  }, [idRisco]);

  async function enviar(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    if (arquivo.size > LIMITE_BYTES) {
      avisar("O arquivo passa do limite de 5 MB.", "error");
      return;
    }
    setEnviando(true);
    try {
      const novo = await servicoRiscos.anexar(idRisco, arquivo);
      setAnexos((atuais) => [novo, ...atuais]);
      avisar("Evidência anexada.");
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      avisar(typeof detalhe === "string" ? detalhe : "Não foi possível anexar o arquivo.", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function baixar(anexo) {
    try {
      const blob = await servicoRiscos.baixarAnexo(idRisco, anexo.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = anexo.nome_arquivo;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      avisar("Não foi possível baixar o arquivo.", "error");
    }
  }

  async function excluir(anexo) {
    const ok = await confirmar({
      titulo: "Excluir anexo?",
      mensagem: `"${anexo.nome_arquivo}" será removido do risco. Essa ação não pode ser desfeita.`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    try {
      await servicoRiscos.excluirAnexo(idRisco, anexo.id);
      setAnexos((atuais) => atuais.filter((a) => a.id !== anexo.id));
      avisar("Anexo excluído.");
    } catch {
      avisar("Não foi possível excluir o anexo.", "error");
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <AttachFileIcon sx={{ color: "text.secondary", fontSize: 22 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Evidências e anexos
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Atas, prints, e-mails ou relatórios que documentam o risco e o tratamento (até 5 MB cada).
          </Typography>
        </Box>
        <input ref={entradaRef} type="file" hidden onChange={enviar} />
        <Button
          variant="outlined"
          size="small"
          startIcon={enviando ? <CircularProgress size={14} /> : <AttachFileIcon />}
          disabled={enviando}
          onClick={() => entradaRef.current?.click()}
        >
          {enviando ? "Enviando…" : "Anexar arquivo"}
        </Button>
      </Box>
      {anexos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhuma evidência anexada ainda.
        </Typography>
      ) : (
        <Stack divider={<Divider />} spacing={1}>
          {anexos.map((anexo) => (
            <Box key={anexo.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <InsertDriveFileOutlinedIcon sx={{ color: "text.secondary" }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {anexo.nome_arquivo}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tamanhoLegivel(anexo.tamanho)} · {new Date(anexo.criado_em).toLocaleString("pt-BR")}
                </Typography>
              </Box>
              <Tooltip title="Baixar">
                <IconButton size="small" onClick={() => baixar(anexo)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton size="small" onClick={() => excluir(anexo)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
