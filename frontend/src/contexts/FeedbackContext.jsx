import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from "@mui/material";

// Avisos rápidos (toasts) e confirmações ("tem certeza?") para o sistema todo.
//   const avisar = useAviso();       avisar("Risco salvo")  /  avisar("Falhou", "error")
//   const confirmar = useConfirmacao();
//   if (await confirmar({ titulo, mensagem, confirmar: "Arquivar", perigo: true })) { ... }
const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [aviso, setAviso] = useState(null); // { texto, tipo, chave }
  const [pergunta, setPergunta] = useState(null);
  const resolverRef = useRef(null);

  const avisar = useCallback((texto, tipo = "success") => {
    setAviso({ texto, tipo, chave: Date.now() });
  }, []);

  const confirmar = useCallback(
    (opcoes) =>
      new Promise((resolver) => {
        resolverRef.current = resolver;
        setPergunta(opcoes);
      }),
    []
  );

  function responder(resposta) {
    resolverRef.current?.(resposta);
    resolverRef.current = null;
    setPergunta(null);
  }

  return (
    <FeedbackContext.Provider value={{ avisar, confirmar }}>
      {children}
      <Snackbar
        key={aviso?.chave}
        open={Boolean(aviso)}
        autoHideDuration={3500}
        onClose={(_, motivo) => motivo !== "clickaway" && setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {aviso ? (
          <Alert severity={aviso.tipo} variant="filled" onClose={() => setAviso(null)} sx={{ fontWeight: 500 }}>
            {aviso.texto}
          </Alert>
        ) : undefined}
      </Snackbar>
      <Dialog open={Boolean(pergunta)} onClose={() => responder(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{pergunta?.titulo}</DialogTitle>
        <DialogContent>
          <DialogContentText>{pergunta?.mensagem}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => responder(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={pergunta?.perigo ? "error" : "primary"}
            onClick={() => responder(true)}
            autoFocus
          >
            {pergunta?.confirmar ?? "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

export function useAviso() {
  return useContext(FeedbackContext).avisar;
}

export function useConfirmacao() {
  return useContext(FeedbackContext).confirmar;
}
