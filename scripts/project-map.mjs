import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib', 'tests'];
const SCAN_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.mjs',
  '.css',
  '.json',
]);
const CONFIG_FILES = [
  'next.config.ts',
  'vite.config.ts',
  'tsconfig.json',
  'package.json',
];
const SCRIPT_FILES = ['.ps1', '.mjs'];
const ENTRY_POINTS = [
  'app/page.tsx',
  'app/api/dashboard/route.ts',
  'app/layout.tsx',
];
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);
const HTTP_MANUAL = {
  from: 'components/dashboard/dashboard.tsx',
  to: 'app/api/dashboard/route.ts',
  endpoint: '/api/dashboard',
};
const OUT_JSON = 'docs/project-graph.json';
const OUT_MD = 'docs/PROJECT_MAP.md';

const toPosix = (p) => p.split(path.sep).join('/');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (SCAN_EXTS.has(path.extname(e.name))) out.push(full);
  }
  return out;
}

function collectFiles() {
  const set = new Set();
  for (const d of SCAN_DIRS)
    for (const f of walk(path.join(ROOT, d)))
      set.add(toPosix(path.relative(ROOT, f)));
  for (const f of CONFIG_FILES) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) set.add(f);
  }
  const scriptsDir = path.join(ROOT, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const e of fs.readdirSync(scriptsDir, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      const ext = path.extname(e.name);
      if (SCRIPT_FILES.includes(ext) || ext === '.mjs')
        set.add('scripts/' + e.name);
    }
  }
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function loadTsconfig() {
  const cfgPath = path.join(ROOT, 'tsconfig.json');
  try {
    const raw = ts.readConfigFile(cfgPath, (p) => ts.sys.readFile(p));
    if (raw.error)
      return {
        options: {},
        configFile: undefined,
        error: ts.flattenDiagnosticMessageText(raw.error.messageText, '\n'),
      };
    const parsed = ts.parseJsonConfigFileContent(
      raw.config,
      ts.sys,
      ROOT,
      {},
      cfgPath,
    );
    if (parsed.errors.length)
      throw new Error(
        `tsconfig diagnostics:\n${parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, '\n')).join('\n')}`,
      );
    return { options: parsed.options, configFile: parsed, error: null };
  } catch (e) {
    return {
      options: {},
      configFile: undefined,
      error: String((e && e.message) || e),
    };
  }
}

function safeReadFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function hashSource(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function kindForFile(rel) {
  const ext = path.extname(rel);
  if (ext === '.json') return 'json';
  if (ext === '.css') return 'css';
  if (rel.endsWith('.ps1')) return 'script';
  if (rel.endsWith('.mjs')) return 'script';
  if (CONFIG_FILES.includes(rel)) return 'config';
  return 'source';
}

function analyzeSource(rel, text, tsconfig) {
  const filePath = path.join(ROOT, rel);
  const isTsx = rel.endsWith('.tsx');
  const isJs =
    rel.endsWith('.js') || rel.endsWith('.jsx') || rel.endsWith('.mjs');
  const kindScript = isJs
    ? ts.ScriptKind.JS
    : isTsx
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(
    rel,
    text,
    ts.ScriptTarget.Latest,
    true,
    kindScript,
  );
  const exports = new Set();
  const deps = new Set();
  const external = new Set();
  const unresolvedSpecs = new Set();

  const isLocalModuleSpec = (spec) => {
    if (typeof spec !== 'string' || !spec) return false;
    if (spec.startsWith('node:')) return false;
    if (spec.startsWith('.')) return true;
    if (spec.startsWith('/')) return true;
    const compilerOpts = tsconfig.options || {};
    const aliases = compilerOpts.paths || {};
    for (const key of Object.keys(aliases)) {
      const prefix = key.replace(/\*$/, '');
      if (spec.startsWith(prefix)) return true;
      if (key === '*') return true;
    }
    return false;
  };

  const tryCssFallback = (spec, fromFile) => {
    if (!spec.endsWith('.css')) return null;
    const fromDir = path.dirname(fromFile);
    let base = spec;
    if (!spec.startsWith('.')) {
      const compilerOpts = tsconfig.options || {};
      const aliases = compilerOpts.paths || {};
      const baseUrl = compilerOpts.baseUrl
        ? path.resolve(ROOT, compilerOpts.baseUrl)
        : ROOT;
      let aliased = null;
      for (const key of Object.keys(aliases)) {
        const prefix = key.replace(/\*$/, '');
        if (spec.startsWith(prefix)) {
          const rest = spec.slice(prefix.length);
          const targets = aliases[key];
          if (targets && targets.length) {
            const t = targets[0].replace(/\*$/, '') + rest;
            aliased = path.resolve(baseUrl, t);
            break;
          }
        }
      }
      if (aliased) base = path.relative(fromDir, aliased);
    }
    const candidates = [];
    if (base.startsWith('.')) {
      const abs = path.resolve(fromDir, base);
      candidates.push(abs);
    } else {
      if (base.startsWith('/'))
        candidates.push(path.resolve(ROOT, base.slice(1)));
      else candidates.push(path.resolve(ROOT, base));
    }
    for (const c of candidates) {
      try {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          const relResolved = toPosix(path.relative(ROOT, c));
          if (!relResolved.startsWith('..')) return relResolved;
        }
      } catch {}
    }
    return null;
  };

  const resolveLocal = (spec, fromFile) => {
    try {
      const res = ts.resolveModuleName(
        spec,
        fromFile,
        tsconfig.options || {},
        ts.sys,
      );
      const resolved = res.resolvedModule;
      if (!resolved) return tryCssFallback(spec, fromFile);
      const relResolved = toPosix(
        path.relative(ROOT, resolved.resolvedFileName),
      );
      if (relResolved.startsWith('..')) return null;
      return relResolved;
    } catch {
      return tryCssFallback(spec, fromFile);
    }
  };

  const handleSpec = (spec) => {
    if (typeof spec !== 'string') return;
    if (isLocalModuleSpec(spec)) {
      const r = resolveLocal(spec, filePath);
      if (r) deps.add(r);
      else unresolvedSpecs.add(spec);
    } else if (
      !spec.startsWith('node:') &&
      !spec.startsWith('.') &&
      !spec.startsWith('/')
    ) {
      const pkg = spec.startsWith('@')
        ? spec.split('/').slice(0, 2).join('/')
        : spec.split('/')[0];
      if (pkg && !pkg.startsWith('.')) external.add(pkg);
    }
  };

  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      handleSpec(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
        handleSpec(node.moduleSpecifier.text);
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) exports.add(el.name.text);
      } else if (!node.exportClause) {
        exports.add('*');
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (callee && callee.kind === ts.SyntaxKind.ImportKeyword) {
        const a = node.arguments[0];
        if (a && ts.isStringLiteral(a)) handleSpec(a.text);
      } else if (ts.isIdentifier(callee) && callee.text === 'require') {
        const a = node.arguments[0];
        if (a && ts.isStringLiteral(a)) handleSpec(a.text);
      }
    } else if (ts.isExportAssignment(node)) {
      exports.add('default');
    } else if (ts.canHaveModifiers(node)) {
      const mods = ts.getModifiers(node);
      if (mods && mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isFunctionDeclaration(node) && node.name)
          exports.add(node.name.text);
        else if (ts.isClassDeclaration(node) && node.name)
          exports.add(node.name.text);
        else if (ts.isVariableStatement(node)) {
          for (const d of node.declarationList.declarations) {
            if (ts.isIdentifier(d.name)) exports.add(d.name.text);
          }
        } else if (ts.isInterfaceDeclaration(node)) exports.add(node.name.text);
        else if (ts.isTypeAliasDeclaration(node)) exports.add(node.name.text);
        else if (ts.isEnumDeclaration(node)) exports.add(node.name.text);
        if (mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))
          exports.add('default');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return {
    exports: [...exports].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    deps: [...deps].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    external: [...external].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    unresolved: [...unresolvedSpecs].sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    ),
  };
}

function buildGraph() {
  const files = collectFiles();
  const tsconfig = loadTsconfig();
  if (tsconfig.error)
    throw new Error(String(tsconfig.error.message || tsconfig.error));
  const nodes = new Map();
  const edges = [];
  const unresolvedEntries = [];

  for (const rel of files) {
    const full = path.join(ROOT, rel);
    const stat = fs.statSync(full);
    const kind = kindForFile(rel);
    const node = {
      path: rel,
      kind,
      size: stat.size,
      ...(kind === 'json' || kind === 'css' ? { mtime: stat.mtimeMs } : {}),
    };
    if (kind === 'source' || kind === 'config' || kind === 'script') {
      const text = safeReadFile(full);
      if (text !== null) {
        node.hash = hashSource(text);
        if (SOURCE_EXTS.has(path.extname(rel))) {
          const isSource = SOURCE_EXTS.has(path.extname(rel));
          if (isSource) {
            const a = analyzeSource(rel, text, tsconfig);
            node.exports = a.exports;
            node.dependencies = a.deps;
            node.externalDependencies = a.external;
            for (const u of a.unresolved)
              unresolvedEntries.push({ from: rel, spec: u });
            node.lines = text.split('\n').length;
          }
        } else if (rel === 'package.json') {
          try {
            const pkg = JSON.parse(text);
            node.metadata = {
              name: pkg.name || null,
              version: pkg.version || null,
              private: !!pkg.private,
            };
          } catch {
            node.metadata = {};
          }
        }
      }
    }
    nodes.set(rel, node);
  }

  // Edges
  for (const [rel, node] of nodes) {
    if (node.dependencies && node.dependencies.length) {
      for (const to of node.dependencies) {
        edges.push({ from: rel, to, kind: 'import' });
      }
    }
  }

  // HTTP manual
  if (nodes.has(HTTP_MANUAL.from) && nodes.has(HTTP_MANUAL.to)) {
    edges.push({
      from: HTTP_MANUAL.from,
      to: HTTP_MANUAL.to,
      kind: 'http-fetch',
      endpoint: HTTP_MANUAL.endpoint,
    });
  }

  // importedBy
  const importedBy = new Map();
  for (const e of edges) {
    if (e.kind === 'import') {
      if (!importedBy.has(e.to)) importedBy.set(e.to, new Set());
      importedBy.get(e.to).add(e.from);
    }
  }
  for (const [rel, node] of nodes) {
    if (importedBy.has(rel))
      node.importedBy = [...importedBy.get(rel)].sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
      );
    else if (node.dependencies) node.importedBy = [];
  }

  const unresolvedList = unresolvedEntries.slice();

  const edgesSorted = edges
    .slice()
    .sort((a, b) =>
      (a.from + '|' + a.to + '|' + a.kind).localeCompare(
        b.from + '|' + b.to + '|' + b.kind,
      ),
    );
  const nodesObj = {};
  for (const rel of [...nodes.keys()].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  ))
    nodesObj[rel] = nodes.get(rel);

  return {
    version: 1,
    root: '.',
    tsconfigError: tsconfig.error || null,
    entries: ENTRY_POINTS,
    nodes: nodesObj,
    edges: edgesSorted,
    manualRelations: [
      {
        from: HTTP_MANUAL.from,
        to: HTTP_MANUAL.to,
        kind: 'http-fetch',
        endpoint: HTTP_MANUAL.endpoint,
        note: 'Relación HTTP manual (fetch), no es import estático',
      },
    ],
    unresolved: unresolvedList.sort((a, b) =>
      (a.from + '|' + a.spec).localeCompare(b.from + '|' + b.spec),
    ),
  };
}

function renderMarkdown(graph) {
  const nodes = graph.nodes || {},
    edges = graph.edges || [];
  const groups = {},
    ids = {};
  const groupOf = (p) => p.split('/').slice(0, -1).join('/') || 'config';
  Object.keys(nodes).forEach((p) => {
    const g = p.includes('components/ui') ? 'components/ui' : groupOf(p);
    (groups[g] = groups[g] || []).push(p);
  });
  const gkeys = Object.keys(groups).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  gkeys.forEach((g, i) => (ids[g] = 'g' + i));
  let m = '```mermaid\ngraph LR\n';
  gkeys.forEach((g) => (m += `  ${ids[g]}["${g} (${groups[g].length})"]\n`));
  const seen = new Set();
  edges.forEach((e) => {
    const ga = e.from.includes('components/ui')
      ? 'components/ui'
      : groupOf(e.from);
    const gb = e.to.includes('components/ui') ? 'components/ui' : groupOf(e.to);
    if (ga === gb || !ids[ga] || !ids[gb]) return;
    const key = ga + '>' + gb + ':' + e.kind;
    if (seen.has(key)) return;
    seen.add(key);
    if (e.kind === 'http-fetch')
      m += `  ${ids[ga]} -.->|"HTTP ${e.endpoint}"| ${ids[gb]}\n`;
    else m += `  ${ids[ga]} --> ${ids[gb]}\n`;
  });
  m +=
    '```\n\n## Tabla de módulos\n\n| Módulo | Enlace | Líneas | Dependencias directas |\n|---|---|---|---|\n';
  Object.keys(nodes)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .forEach((p) => {
      if (p.includes('components/ui')) return;
      const n = nodes[p];
      const deps = (n.dependencies || []).join(', ') || '—';
      m += `| ${p.split('/').pop()} | [${p}](../${p}) | ${n.lines || 0} | ${deps} |\n`;
    });
  const uiCount = Object.keys(nodes).filter((p) =>
    p.includes('components/ui'),
  ).length;
  m += `\n## Resumen UI\n\nHay ${uiCount} archivo(s) en components/ui, agrupados en un nodo único.\n\n`;
  m +=
    '## Uso de la CLI\n\n- `--focus`: lee el grafo guardado en JSON y lo renderiza sin volver a analizar las fuentes.\n- `--check`: recorre las fuentes del proyecto y valida el grafo sin escribir archivos ni modificarlo.\n- Sin argumentos: regenera el grafo y su salida.\n- Formatos opacos: JSON y CSS no se parsean, se listan como dependencias sin análisis interno.\n';
  return m;
}

function writeOutputs(graph) {
  const jsonPath = path.join(ROOT, OUT_JSON);
  const mdPath = path.join(ROOT, OUT_MD);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  const json = JSON.stringify(graph, null, 2) + '\n';
  const md = renderMarkdown(graph);
  fs.writeFileSync(jsonPath, json, 'utf8');
  fs.writeFileSync(mdPath, md, 'utf8');
  return { json, md };
}

function checkOutputs(graph) {
  const jsonPath = path.join(ROOT, OUT_JSON);
  const mdPath = path.join(ROOT, OUT_MD);
  const expectedJson = JSON.stringify(graph, null, 2) + '\n';
  const expectedMd = renderMarkdown(graph);
  let stale = false;
  const curJson = fs.existsSync(jsonPath)
    ? fs.readFileSync(jsonPath, 'utf8')
    : null;
  const curMd = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : null;
  if (curJson === null) {
    console.error(`MISSING: ${OUT_JSON}`);
    stale = true;
  } else if (curJson !== expectedJson) {
    console.error(`STALE: ${OUT_JSON}`);
    stale = true;
  }
  if (curMd === null) {
    console.error(`MISSING: ${OUT_MD}`);
    stale = true;
  } else if (curMd !== expectedMd) {
    console.error(`STALE: ${OUT_MD}`);
    stale = true;
  }
  return stale;
}

function printFocus(graph, focusPath) {
  const rel = toPosix(focusPath.replace(/^\.\//, ''));
  const node = graph.nodes[rel];
  if (!Object.hasOwn(graph.nodes, rel)) {
    console.error(`No está en el inventario: ${rel}`);
    process.exit(2);
  }
  const out = {
    node,
    edges: graph.edges.filter((e) => e.from === rel || e.to === rel),
    manualRelations: graph.manualRelations.filter(
      (r) => r.from === rel || r.to === rel,
    ),
  };
  console.log(JSON.stringify(out, null, 2));
}

function help() {
  console.log(
    'Uso: node scripts/project-map.mjs [--check | --focus <ruta> | --help]',
  );
  console.log('Sin args: genera docs/project-graph.json y docs/PROJECT_MAP.md');
  console.log(
    '--check: compara contenido generado con existente (exit 1 si stale/missing)',
  );
  console.log(
    '--focus <ruta>: imprime nodo y relaciones (no escribe archivos)',
  );
  console.log('--help: muestra esta ayuda');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    help();
    return;
  }
  if (args.includes('--focus')) {
    const i = args.indexOf('--focus');
    const f = args[i + 1];
    if (!f) {
      console.error('--focus requiere <ruta>');
      process.exit(2);
    }
    const jsonPath = path.join(ROOT, OUT_JSON);
    if (!fs.existsSync(jsonPath)) {
      console.error(`No existe ${OUT_JSON}. Ejecuta sin args para generarlo.`);
      process.exit(2);
    }
    let graph;
    try {
      graph = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.error(`JSON inválido en ${OUT_JSON}: ${e.message}`);
      process.exit(2);
    }
    printFocus(graph, f);
    return;
  }
  if (args.includes('--check')) {
    const graph = buildGraph();
    const stale = checkOutputs(graph);
    if (stale) process.exit(1);
    console.log('OK: outputs actualizados.');
    return;
  }
  const graph = buildGraph();
  writeOutputs(graph);
  console.log(`Escritos ${OUT_JSON} y ${OUT_MD}`);
}

main();
