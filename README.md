# Dashboard de Cenários (HTML/CSS/JS)

Visualização moderna de estudos de planejamento militar com filtros por `user_id` e `cenario_id`, integrando com tabelas do Supabase.

## Pré-requisitos
- Acesso a um projeto Supabase com as tabelas indicadas.
- Chave `anon` e URL do Supabase.
- Um servidor HTTP simples para servir os arquivos (recomendado). Abrir via `file://` pode bloquear imports ES Modules.

## Configuração
1. Duplique `config.example.js` como `config.js` na mesma pasta.
2. Edite `config.js` e informe:
   - `SUPABASE_URL`: URL do seu projeto Supabase.
   - `SUPABASE_ANON_KEY`: chave pública anon.

Exemplo:
```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "ey...",
  SCHEMA: "public"
};
```

## Executando localmente
- Opção 1 (Recomendado - Vite/Node):
  - Instale dependências: `npm install`
  - Inicie: `npm run dev`
  - Acesse a URL exibida (por padrão http://localhost:8000)
- Opção 2 (VS Code): use a extensão Live Server e abra `index.html`.
- Opção 3 (Node simples): `npx serve` ou `npx http-server` na pasta e acesse a porta indicada.

## Uso
1. Abra no navegador.
2. Preencha `user_id` e `cenario_id` nos filtros.
3. Clique em "Carregar". As seções serão preenchidas com dados que satisfaçam (user_id AND cenario_id).

## Tabelas e campos suportados
- Matriz de Incertezas: `Matriz_Incertezas` (lida `quadrante`, `incertezas`). Fallback para typo `user_is`.
- Tendências: `Tendências` (sem `user_id`/`cenario_id` no DDL; retorna todas).
- Cenários: `Cenários` (lê `nome`, `narrativa`, `desafios`).
- Ameaças: `Ameaças` (lê `descrição`/`descricao` ou `id_x`).
- SMEM Futuro: `SMEM Futuro` (lê `smem_futuro` ou `ameaca`).
- SMEM Corrente: `SMEM Corrente` (lê `smem_corrente`, `evolucao`, `tecnologias`).
- Tecnologias: `Tecnologias` (lê `tec_fut`, `referencias`).

Observações de compatibilidade com o DDL fornecido:
- `Matriz_Incertezas` apresenta `user_is` (typo); o app tenta ambos `user_id` e `user_is`.
- `Enredo` apresenta `cenario_is` (typo); há fallback no código caso você queira usar essa tabela futuramente.
- Nomes de tabelas com acentos/espaços são usados como criados no Supabase (ex.: `SMEM Futuro`).

## Estilo / Tema
- UI moderna inspirada em sistema militar, com paleta escura e elementos de cartões/matrizes.

## Troubleshooting
- Erro CORS/Modules ao abrir arquivo diretamente: sirva com um servidor HTTP local.
- 401/403 do Supabase: verifique URL/chave anon e políticas RLS das tabelas.
- Dados vazios: confira se as linhas possuem os campos `user_id` e `cenario_id` correspondentes.
