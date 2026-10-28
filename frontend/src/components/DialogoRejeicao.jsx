import { useCallback, useRef, useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";

// Motivos mais comuns, para responder com um clique. O texto continua editável.
const MOTIVOS_RAPIDOS = [
  "Custo alto para a fase atual",
  "Não se aplica ao contexto do projeto",
  "Já existe um tratamento em andamento",
  "As notas do risco estão superestimadas",
];

const LIMITE = 500;

// Rejeitar uma recomendação pede o motivo (opcional). O motivo fica registrado
// com a decisão e ajuda a entender onde o modelo erra.
// Uso: const [dialogo, pedirMotivo] = useDialogoRejeicao();
//      const motivo = await pedirMotivo();  // null = cancelou; "" = sem motivo
export function useDialogoRejeicao() {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const resolver = useRef(null);

  const pedirMotivo = useCallback(() => {
    setMotivo("");
    setAberto(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function fechar(resultado) {
    setAberto(false);
    resolver.current?.(resultado);
    resolver.current = null;
  }

  const dialogo = (
    <Dialog open={aberto} onClose={() => fechar(null)} maxWidth="sm" fullWidth>
      <DialogTitle>Rejeitar o plano recomendado?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          O status do risco é mantido e você poderá gerar uma nova recomendação depois. Se quiser, diga por quê: o motivo fica registrado
          com a decisão.
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
          {MOTIVOS_RAPIDOS.map((m) => (
            <Chip
              key={m}
              label={m}
              variant={motivo === m ? "filled" : "outlined"}
              color={motivo === m ? "primary" : "default"}
              onClick={() => setMotivo(m)}
            />
          ))}
        </Stack>
        <TextField
          label="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value.slice(0, LIMITE))}
          multiline
          minRows={2}
          fullWidth
          helperText={`${motivo.length}/${LIMITE}`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => fechar(null)}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={() => fechar(motivo.trim())}>
          Rejeitar
        </Button>
      </DialogActions>
    </Dialog>
  );

  return [dialogo, pedirMotivo];
}
