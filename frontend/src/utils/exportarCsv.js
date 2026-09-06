// Exportação client-side (sem endpoint novo no backend): monta um CSV a partir
// de uma lista de objetos já carregada na tela e dispara o download no navegador.
export function exportarCsv(nomeArquivo, colunas, linhas) {
  const cabecalho = colunas.map((c) => c.rotulo).join(";");
  const corpo = linhas
    .map((linha) => colunas.map((c) => `"${String(c.valor(linha) ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const csv = `${cabecalho}\n${corpo}`;
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
