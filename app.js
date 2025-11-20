import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cfg = window.APP_CONFIG || {};
let supabase = null;

function ensureConfig() {
  const missing = [];
  if (!cfg.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!cfg.SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  if (missing.length) throw new Error("Config ausente: " + missing.join(", "));
}

function initSupabase() {
  ensureConfig();
  supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { db: { schema: cfg.SCHEMA || "public" } });
}

function byUserAndCenario(builder, userId, cenarioId) {
  return builder.eq("user_id", userId).eq("cenario_id", cenarioId);
}

function normalizeTable(name) {
  // Alguns nomes contém espaços/acentos. No Supabase, use exatamente como a tabela foi criada.
  // Aqui centralizamos os nomes esperados para evitar typos no código.
  const map = {
    "Ameaças": "Ameaças",
    "Ameacas": "Ameaças",
    "Cenários": "Cenários",
    "Enredo": "Enredo",
    "Matriz_Incertezas": "Matriz_Incertezas",
    "SMEM Futuro": "SMEM Futuro",
    "SMEM Corrente": "SMEM Corrente",
    "Tecnologias": "Tecnologias",
    "Tendências": "Tendências",
  };
  return map[name] || name;
}

async function fetchTable(name, userId, cenarioId, extra = (q)=>q) {
  const table = normalizeTable(name);
  // Seleções específicas para colunas com acentos
  let selectExpr = "*";
  if (name === "Ameaças") {
    // Aliás para evitar problemas de chave com acento no JS
    selectExpr = 'id, created_at, user_id, cenario_id, id_x, descricao:"descrição"';
  }
  let query = supabase.from(table).select(selectExpr);
  if (name === "Matriz_Incertezas") {
    // Matriz_Incertezas: usar apenas user_id e cenario_id
    query = extra(byUserAndCenario(query, userId, cenarioId));
  } else {
    query = extra(byUserAndCenario(query, userId, cenarioId));
  }
  // Nenhum tratamento especial quando name = "Enredo"; usa (user_id AND cenario_id)

  const { data, error } = await query;
  if (error) {
    const msg = String(error.message || error);
    if (msg.toLowerCase().includes("relation") && msg.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw error;
  }

  // Enredo: sem fallback para cenario_is; padronizado para cenario_id

  return data || [];
}

// -------- Dropdown helpers --------
async function fetchDistinctUsers() {
  // Usa a tabela Cenários como referência de autorias
  const table = normalizeTable("Cenários");
  const { data, error } = await supabase
    .from(table)
    .select("user_id")
    .not("user_id", "is", null)
    .neq("user_id", "")
    .order("user_id", { ascending: true });
  if (error) throw error;
  const set = new Set((data || []).map(r => r.user_id));
  return Array.from(set).sort();
}

async function fetchDistinctCenariosForUser(userId) {
  // 1) Fonte primária: Cenários
  const tableC = normalizeTable("Cenários");
  const { data: dC, error: eC } = await supabase
    .from(tableC)
    .select("cenario_id, nome")
    .eq("user_id", userId)
    .not("cenario_id", "is", null)
    .neq("cenario_id", "")
    .order("cenario_id", { ascending: true });
  if (eC) throw eC;

  const map = new Map();
  for (const r of dC || []) {
    const id = r.cenario_id;
    if (!map.has(id)) map.set(id, id); // sempre mostrar o código do planejamento
  }

  // 2) Se vazio, buscar em outras tabelas e unificar
  if (map.size === 0) {
    const tablesExtra = [
      "Matriz_Incertezas",
      "Ameaças",
      "SMEM Futuro",
      "SMEM Corrente",
      "Tecnologias",
    ];
    for (const t of tablesExtra) {
      try {
        const tbl = normalizeTable(t);
        const { data } = await supabase
          .from(tbl)
          .select("cenario_id")
          .eq("user_id", userId)
          .not("cenario_id", "is", null)
          .neq("cenario_id", "");
        for (const r of data || []) {
          const id = r.cenario_id;
          if (!map.has(id)) map.set(id, id);
        }
      } catch { /* ignora falhas pontuais */ }
    }
  }

  return Array.from(map.keys()).sort();
}

function populateSelect(select, options, { placeholder = "Selecione" } = {}) {
  select.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = ""; ph.textContent = placeholder; ph.disabled = true; ph.selected = true;
  select.appendChild(ph);
  for (const opt of options) {
    const o = document.createElement("option");
    if (typeof opt === "string") { o.value = opt; o.textContent = opt; }
    else { o.value = opt.id; o.textContent = opt.nome || opt.id; }
    select.appendChild(o);
  }
}

function setLoading(id, show, message = "Carregando…") {
  const el = document.getElementById(id);
  if (!el) return;
  const statusId = id + "__status";
  let status = document.getElementById(statusId);
  if (show) {
    if (!status) {
      status = document.createElement("div");
      status.id = statusId;
      status.className = "loading";
      el.parentElement?.insertBefore(status, el.nextSibling);
    }
    status.textContent = message;
  } else {
    if (status) status.remove();
  }
}
function setError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  const statusId = id + "__status";
  let status = document.getElementById(statusId);
  if (!status) {
    status = document.createElement("div");
    status.id = statusId;
    status.className = "error";
    el.parentElement?.insertBefore(status, el.nextSibling);
  }
  status.textContent = message;
}
function setEmpty(id, message = "Sem dados.") {
  const el = document.getElementById(id);
  if (!el) return;
  const statusId = id + "__status";
  let status = document.getElementById(statusId);
  if (!status) {
    status = document.createElement("div");
    status.id = statusId;
    status.className = "empty";
    el.parentElement?.insertBefore(status, el.nextSibling);
  }
  status.textContent = message;
}

function ensureMatrizStructure() {
  const grid = document.getElementById("matrizGrid");
  if (!grid) return;
  if (grid.querySelectorAll('.cell').length === 4) return;
  grid.innerHTML = `
    <div class="cell" data-quadrante="Q1"><h3>Q1</h3><ul class="list"></ul></div>
    <div class="cell" data-quadrante="Q2"><h3>Q2</h3><ul class="list"></ul></div>
    <div class="cell" data-quadrante="Q3"><h3>Q3</h3><ul class="list"></ul></div>
    <div class="cell" data-quadrante="Q4"><h3>Q4</h3><ul class="list"></ul></div>
  `;
}

function ensureCenariosStructure() {
  const grid = document.getElementById("cenariosGrid");
  if (!grid) return;
  if (grid.querySelectorAll('.cell .scenario').length === 4) return;
  grid.innerHTML = `
    <div class="cell"><h3>C1</h3><div class="scenario"></div></div>
    <div class="cell"><h3>C2</h3><div class="scenario"></div></div>
    <div class="cell"><h3>C3</h3><div class="scenario"></div></div>
    <div class="cell"><h3>C4</h3><div class="scenario"></div></div>
  `;
}

function updateDebug(ctx) {
  const bar = document.getElementById("debugBar");
  const toggle = document.getElementById("debugToggle");
  if (!bar || !toggle) return;
  const on = toggle.checked;
  bar.hidden = !on;
  if (!on) return;
  const { userId, cenarioId, matriz, enredo, cenarios, ameacas, smemFut, smemCorr, tecs } = ctx;
  const quadrantes = (matriz || []).map(r => r.quadrante).filter(Boolean);
  const qDistinct = Array.from(new Set(quadrantes));
  const enredoTxt = (enredo && enredo[0] && enredo[0].enredo) ? String(enredo[0].enredo) : "";
  const enredoSnippet = enredoTxt ? enredoTxt.slice(0, 160) + (enredoTxt.length > 160 ? '…' : '') : '';
  bar.textContent = [
    `user_id=${userId} cenario_id=${cenarioId}`,
    `Matriz_Incertezas: ${matriz?.length ?? 0} registros | quadrantes distintos: ${qDistinct.join(', ') || '-'}`,
    `Enredo: ${enredo?.length ?? 0}${enredoSnippet ? ' | trecho: ' + enredoSnippet : ''}`,
    `Cenários: ${cenarios?.length ?? 0}`,
    `Ameaças: ${ameacas?.length ?? 0}`,
    `SMEM Futuro: ${smemFut?.length ?? 0}`,
    `SMEM Corrente: ${smemCorr?.length ?? 0}`,
    `Tecnologias: ${tecs?.length ?? 0}`,
  ].join('\n');
}

function renderList(container, items, mapItem) {
  if (!container) return;
  container.innerHTML = "";
  if (!items || items.length === 0) {
    return; // Não exibe mensagem quando não há dados
  }
  for (const it of items) {
    container.insertAdjacentHTML("beforeend", mapItem(it));
  }
}

function renderMatrizIncertezas(data) {
  const grid = document.getElementById("matrizGrid");
  grid.querySelectorAll(".cell .list").forEach(ul => ul.innerHTML = "");
  if (!data || data.length === 0) {
    grid.querySelectorAll(".cell .list").forEach(ul => ul.innerHTML = `<li class="empty">Sem dados</li>`);
    return;
  }
  for (const row of data) {
    const quadRaw = row.quadrante ?? "";
    const quadTxt = quadRaw.toString().trim();
    let key = quadTxt.toUpperCase();
    // Mapear padrões como "Incerteza (1,1)" -> Q1 etc.
    const m = quadTxt.match(/\((\d+)\s*,\s*(\d+)\)/);
    if (m) {
      const i = Number(m[1]);
      const j = Number(m[2]);
      if (i === 1 && j === 1) key = 'Q1';
      else if (i === 1 && j === 2) key = 'Q2';
      else if (i === 2 && j === 1) key = 'Q3';
      else if (i === 2 && j === 2) key = 'Q4';
    }
    const cellWrap = grid.querySelector(`.cell[data-quadrante="${key}"]`);
    if (!cellWrap) continue;
    // Título do quadrante vem do campo "quadrante"
    const h = cellWrap.querySelector('h3');
    if (h && quadTxt) h.textContent = quadTxt;
    const cell = cellWrap.querySelector('.list');
    const text = (row.incertezas ?? "").toString().trim();
    if (cell && text) cell.insertAdjacentHTML("beforeend", `<li>${escapeHtml(text)}</li>`);
  }
}

function renderCenarios(data) {
  const grid = document.getElementById("cenariosGrid");
  const cells = grid.querySelectorAll(".cell .scenario");
  cells.forEach(c => c.innerHTML = "");
  if (!data || data.length === 0) {
    cells.forEach(c => c.innerHTML = `<div class="line empty">Sem dados</div>`);
    return;
  }
  // Distribuir em C1..C4
  data.slice(0, 4).forEach((row, idx) => {
    const c = cells[idx]; if (!c) return;
    const title = row.nome || `Cenário ${idx + 1}`;
    const narrativa = row.narrativa || "";
    const desafios = row.desafios || "";
    c.insertAdjacentHTML("beforeend", `
      <div class="line"><strong>${escapeHtml(title)}</strong></div>
      ${narrativa ? `<div class="line">Narrativa: ${escapeHtml(narrativa)}</div>` : ""}
      ${desafios ? `<div class="line">Desafios: ${escapeHtml(desafios)}</div>` : ""}
    `);
  });
}

function renderAmeacas(data) {
  const list = document.getElementById("ameacasList");
  renderList(list, data, (row) => {
    const title = row.id_x || "Ameaça";
    const desc = row.descricao || row["descrição"] || "";
    return `<li><strong>${escapeHtml(title)}</strong>${desc ? ` — ${escapeHtml(desc)}` : ""}</li>`;
  });
}

function renderSmemFuturo(data) {
  const list = document.getElementById("smemFutList");
  renderList(list, data, (row) => {
    const label = row.smem_futuro || row.ameaca || JSON.stringify(row);
    return `<li>${escapeHtml(label)}</li>`;
  });
}

function renderSmemCorrente(data) {
  const wrap = document.getElementById("smemCorrenteList");
  wrap.innerHTML = "";
  if (!data || data.length === 0) {
    return; // Não exibe mensagem quando não há dados
  }
  for (const row of data) {
    wrap.insertAdjacentHTML("beforeend", `
      <div class="card">
        ${row.smem_corrente ? `<h4>${escapeHtml(row.smem_corrente)}</h4>` : ""}
        ${row.evolucao ? `<p><strong>Evolução:</strong> ${escapeHtml(row.evolucao)}</p>` : ""}
        ${row.tecnologias ? `<p><strong>Tecnologias:</strong> ${escapeHtml(row.tecnologias)}</p>` : ""}
      </div>
    `);
  }
}

function renderTecnologias(data) {
  const wrap = document.getElementById("tecnologiasList");
  wrap.innerHTML = "";
  if (!data || data.length === 0) {
    return; // Não exibe mensagem quando não há dados
  }
  for (const row of data) {
    wrap.insertAdjacentHTML("beforeend", `
      <div class="card">
        ${row.tec_fut ? `<h4>${escapeHtml(row.tec_fut)}</h4>` : ""}
        ${row.referencias ? `<p>${escapeHtml(row.referencias)}</p>` : ""}
      </div>
    `);
  }
}

function renderEnredo(data) {
  const wrap = document.getElementById("enredoList");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (!data || data.length === 0) {
    return; // Não exibe mensagem quando não há dados
  }
  for (const row of data) {
    wrap.insertAdjacentHTML("beforeend", `
      <div class="card">
        ${row.enredo ? `<p>${escapeHtml(row.enredo)}</p>` : `<p>${escapeHtml(JSON.stringify(row))}</p>`}
      </div>
    `);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadAll() {
  const userId = document.getElementById("userId").value;
  const cenarioId = document.getElementById("cenarioId").value;
  if (!userId || !cenarioId) {
    alert("Preencha user_id e cenario_id.");
    return;
  }
  // loading states
  ensureMatrizStructure();
  setLoading("matrizGrid", true);
  setLoading("enredoList", true);
  ensureCenariosStructure();
  setLoading("cenariosGrid", true);
  setLoading("ameacasList", true);
  setLoading("smemFutList", true);
  setLoading("smemCorrenteList", true);
  setLoading("tecnologiasList", true);

  try {
    const [matriz, enredo, cenarios, ameacas, smemFut, smemCorr, tecs] = await Promise.all([
      fetchTable("Matriz_Incertezas", userId, cenarioId),
      fetchTable("Enredo", userId, cenarioId),
      fetchTable("Cenários", userId, cenarioId),
      fetchTable("Ameaças", userId, cenarioId),
      fetchTable("SMEM Futuro", userId, cenarioId),
      fetchTable("SMEM Corrente", userId, cenarioId),
      fetchTable("Tecnologias", userId, cenarioId),
    ]);

    console.debug("Resumo do carregamento:", {
      userId, cenarioId,
      matriz: matriz?.length ?? 0,
      enredo: enredo?.length ?? 0,
      cenarios: cenarios?.length ?? 0,
      ameacas: ameacas?.length ?? 0,
      smemFut: smemFut?.length ?? 0,
      smemCorr: smemCorr?.length ?? 0,
      tecs: tecs?.length ?? 0,
    });

    renderMatrizIncertezas(matriz);
    if (matriz && matriz.length) console.debug("Matriz_Incertezas exemplo:", matriz[0]);
    if (enredo && enredo.length) console.debug("Enredo exemplo:", enredo[0]);
    renderEnredo(enredo);
    renderCenarios(cenarios);
    renderAmeacas(ameacas);
    renderSmemFuturo(smemFut);
    renderSmemCorrente(smemCorr);
    renderTecnologias(tecs);
    updateDebug({ userId, cenarioId, matriz, enredo, cenarios, ameacas, smemFut, smemCorr, tecs });
  } catch (e) {
    console.error(e);
    setError("matrizGrid", e.message);
    setError("enredoList", e.message);
    setError("cenariosGrid", e.message);
    setError("ameacasList", e.message);
    setError("smemFutList", e.message);
    setError("smemCorrenteList", e.message);
    setError("tecnologiasList", e.message);
  } finally {
    setLoading("matrizGrid", false);
    setLoading("enredoList", false);
    setLoading("cenariosGrid", false);
    setLoading("ameacasList", false);
    setLoading("smemFutList", false);
    setLoading("smemCorrenteList", false);
    setLoading("tecnologiasList", false);
  }
}

function main() {
  try { initSupabase(); } catch (e) { console.error(e); alert(e.message); return; }
  const userSel = document.getElementById("userId");
  const cenSel = document.getElementById("cenarioId");
  const dbgToggle = document.getElementById("debugToggle");
  document.getElementById("loadBtn").addEventListener("click", loadAll);
  dbgToggle?.addEventListener('change', () => {
    // Reatualiza a barra com os últimos dados renderizados (se houver)
    updateDebug({ userId: document.getElementById("userId").value, cenarioId: document.getElementById("cenarioId").value });
  });

  // Carrega usuários ao iniciar
  (async () => {
    try {
      userSel.disabled = true;
      populateSelect(userSel, [], { placeholder: "Carregando usuários..." });
      const users = await fetchDistinctUsers();
      populateSelect(userSel, users, { placeholder: "Selecione um usuário" });
      userSel.disabled = false;
    } catch (e) {
      console.error(e);
      populateSelect(userSel, [], { placeholder: "Erro ao carregar usuários" });
    }
  })();

  // Ao escolher user, carrega cenários correspondentes
  userSel.addEventListener("change", async () => {
    const userId = userSel.value;
    cenSel.disabled = true;
    populateSelect(cenSel, [], { placeholder: userId ? "Carregando planejamentos..." : "Selecione um planejamento" });
    if (!userId) return;
    try {
      const cenarios = await fetchDistinctCenariosForUser(userId);
      populateSelect(cenSel, cenarios, { placeholder: "Selecione um planejamento" });
      cenSel.disabled = false;
    } catch (e) {
      console.error(e);
      populateSelect(cenSel, [], { placeholder: "Erro ao carregar planejamentos" });
    }
  });
}

document.addEventListener("DOMContentLoaded", main);
