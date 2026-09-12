import { useMemo, useState } from "react";
import {
  Box,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EstadoVazio from "./EstadoVazio";

/**
 * Tabela padrão das telas administrativas:
 * - busca inline no topo (filtra pelo texto devolvido por `textoBusca(linha)`)
 * - linhas com hover destacado
 * - coluna de ações visível apenas no hover da linha (`acoes(linha)`)
 * - empty state ilustrado quando não há dados
 *
 * `colunas`: [{ chave, rotulo, render(linha), largura, alinhar }]
 */
export default function TabelaDados({
  colunas,
  linhas,
  chaveLinha = (linha) => linha.id,
  textoBusca,
  placeholderBusca = "Buscar...",
  acoes,
  carregando = false,
  vazio = {},
  filtrosExtras = null,
  estiloLinha,
}) {
  const [busca, setBusca] = useState("");

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo || !textoBusca) return linhas;
    return linhas.filter((linha) => textoBusca(linha).toLowerCase().includes(termo));
  }, [linhas, busca, textoBusca]);

  const totalColunas = colunas.length + (acoes ? 1 : 0);

  return (
    <Paper>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {textoBusca && (
          <TextField
            size="small"
            placeholder={placeholderBusca}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            sx={{ minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        )}
        {filtrosExtras}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {linhasFiltradas.length} {linhasFiltradas.length === 1 ? "registro" : "registros"}
        </Typography>
      </Box>

      <TableContainer>
        <Table size="medium">
          <TableHead>
            <TableRow>
              {colunas.map((coluna) => (
                <TableCell
                  key={coluna.chave}
                  align={coluna.alinhar ?? "left"}
                  sx={{ width: coluna.largura, color: "text.secondary", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}
                >
                  {coluna.rotulo}
                </TableCell>
              ))}
              {acoes && <TableCell align="right" sx={{ width: 120 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {!carregando && linhasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalColunas} sx={{ border: 0 }}>
                  <EstadoVazio
                    titulo={busca ? "Nenhum resultado para a busca" : vazio.titulo ?? "Nada por aqui ainda"}
                    descricao={busca ? "Tente outro termo ou limpe o filtro." : vazio.descricao}
                    acao={busca ? null : vazio.acao}
                  />
                </TableCell>
              </TableRow>
            )}
            {linhasFiltradas.map((linha) => (
              <TableRow
                key={chaveLinha(linha)}
                hover
                sx={{
                  "& .acoes-linha": { opacity: 0, transition: "opacity 0.15s ease" },
                  "&:hover .acoes-linha, &:focus-within .acoes-linha": { opacity: 1 },
                  "&:hover": { backgroundColor: "rgba(45, 212, 191, 0.06) !important" },
                  "&:last-child td": { borderBottom: 0 },
                  ...(estiloLinha ? estiloLinha(linha) : {}),
                }}
              >
                {colunas.map((coluna) => (
                  <TableCell key={coluna.chave} align={coluna.alinhar ?? "left"}>
                    {coluna.render ? coluna.render(linha) : linha[coluna.chave]}
                  </TableCell>
                ))}
                {acoes && (
                  <TableCell align="right">
                    <Box className="acoes-linha" sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      {acoes(linha)}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
