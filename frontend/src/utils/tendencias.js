// Cálculo de micro-tendências para os cards do dashboard: contagem de itens
// por janela de 7 dias (semana atual vs. anterior) e série das últimas semanas
// para a sparkline.
const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

export function tendenciaSemanal(itens, campoData = "criado_em", semanas = 8) {
  const agora = Date.now();
  const serie = Array(semanas).fill(0);

  itens.forEach((item) => {
    const data = new Date(item[campoData]).getTime();
    if (Number.isNaN(data)) return;
    const semanasAtras = Math.floor((agora - data) / MS_POR_SEMANA);
    if (semanasAtras >= 0 && semanasAtras < semanas) {
      serie[semanas - 1 - semanasAtras] += 1;
    }
  });

  return {
    atual: serie[semanas - 1],
    anterior: serie[semanas - 2] ?? 0,
    serie,
  };
}

// Variante para valores percentuais (ex.: taxa de aceitação por semana).
export function tendenciaTaxaSemanal(itens, condicao, campoData = "criado_em", semanas = 8) {
  const agora = Date.now();
  const totais = Array(semanas).fill(0);
  const positivos = Array(semanas).fill(0);

  itens.forEach((item) => {
    const data = new Date(item[campoData]).getTime();
    if (Number.isNaN(data)) return;
    const semanasAtras = Math.floor((agora - data) / MS_POR_SEMANA);
    if (semanasAtras >= 0 && semanasAtras < semanas) {
      const indice = semanas - 1 - semanasAtras;
      totais[indice] += 1;
      if (condicao(item)) positivos[indice] += 1;
    }
  });

  const serie = totais.map((total, i) => (total === 0 ? 0 : Math.round((positivos[i] / total) * 100)));
  return { atual: serie[semanas - 1], anterior: serie[semanas - 2] ?? 0, serie };
}
