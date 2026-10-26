import { useState } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";
import { auth as servicoAuth } from "../services/api";
import { useAviso } from "../contexts/FeedbackContext";

// Troca da própria senha (confirma a atual; a nova precisa ter 8+ caracteres).
export default function FormularioSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();
  const diferente = confirmacao && nova !== confirmacao;
  const valido = atual && nova.length >= 8 && nova === confirmacao;

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      await servicoAuth.trocarSenha(atual, nova);
      setAtual("");
      setNova("");
      setConfirmacao("");
      avisar("Senha alterada.");
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      avisar(typeof detalhe === "string" ? detalhe : "Não foi possível alterar a senha.", "error");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Stack component="form" spacing={1.5} onSubmit={salvar}>
      <TextField size="small" type="password" label="Senha atual" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" />
      <TextField
        size="small"
        type="password"
        label="Nova senha"
        value={nova}
        onChange={(e) => setNova(e.target.value)}
        helperText="Mínimo de 8 caracteres"
        autoComplete="new-password"
      />
      <TextField
        size="small"
        type="password"
        label="Confirmar nova senha"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        error={Boolean(diferente)}
        helperText={diferente ? "As senhas não conferem" : " "}
        autoComplete="new-password"
      />
      <Box>
        <Button type="submit" variant="contained" disabled={!valido || salvando}>
          {salvando ? "Salvando…" : "Alterar senha"}
        </Button>
      </Box>
    </Stack>
  );
}
