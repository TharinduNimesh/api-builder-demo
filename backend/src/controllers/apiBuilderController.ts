import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

type ParamDef = { key: string; location?: string; type?: string; required?: boolean; default?: any };

function extractTokensFromTemplate(tpl: string) {
  const re = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  const out: string[] = [];
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(tpl))) out.push(m[1]);
  return out;
}

function templateToRegex(tpl: string) {
  // escape regex chars except our token braces
  const escaped = tpl.replace(/[-\/\\^$+?.()|[\]{}]/g, (c) => {
    // keep braces so tokens remain
    if (c === '{' || c === '}') return c;
    return `\\${c}`;
  });
  // replace {name} with named capture group
  const reStr = '^' + escaped.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, name) => `(?<${name}>[^/]+)`) + '$';
  return new RegExp(reStr);
}

function normalizePath(p: string) {
  if (!p) return '/';
  // ensure leading slash
  let s = p.startsWith('/') ? p : `/${p}`;
  // collapse multiple slashes
  s = s.replace(/\/+/g, '/');
  // remove trailing slash unless it's the root
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

function formatValueForSql(val: any, type?: string) {
  if (val === undefined || val === null) return 'NULL';
  if (type === 'number') return String(Number(val));
  if (type === 'boolean') return (val === true || String(val).toLowerCase() === 'true') ? 'TRUE' : 'FALSE';
  if (type === 'json') {
    const s = typeof val === 'string' ? val : JSON.stringify(val);
    return `'${s.replace(/'/g, "''")}'`;
  }
  // default: treat as string literal and escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

function normalizeRawValue(rv: any) {
  if (Array.isArray(rv)) rv = rv.length > 0 ? rv[0] : undefined;
  if (typeof rv === 'string') rv = safeDecode(rv).trim();
  return rv;
}

function heuristicCoerceString(s: string): any {
  const str = s.trim();
  const low = str.toLowerCase();
  if (/^-?\d+$/.test(str)) return Number(str);
  if (/^-?\d+\.\d+$/.test(str)) return Number(str);
  if (low === 'true') return true;
  if (low === 'false') return false;
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try { return JSON.parse(str); } catch (e) { /* ignore */ }
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(str) || /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return str;
}

function coerceByType(raw: any, expectedType?: string) {
  if (raw === undefined || raw === null || raw === '') return raw;
  const t = (expectedType || 'string').toLowerCase();
  if (t === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isNaN(n)) throw new Error('Invalid number');
    return n;
  }
  if (t === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    throw new Error('Invalid boolean');
  }
  if (t === 'json') {
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  }
  if (t === 'date') {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
    return d.toISOString();
  }
  // default string
  return String(raw);
}

export const proxyEndpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedPathRaw = req.path || '/';
    const requestedPath = normalizePath(requestedPathRaw);
    const method = req.method.toUpperCase();

    console.log(`[api-builder] incoming ${method} ${requestedPath}`);

    // load candidate endpoints matching method (or all methods if stored method is null)
    const candidates = await prisma.endpoints.findMany();

    // prefer longer path templates to match more specific first (normalize leading slash)
    candidates.sort((a, b) => {
      const aPath = a.path?.startsWith('/') ? a.path : `/${a.path}`;
      const bPath = b.path?.startsWith('/') ? b.path : `/${b.path}`;
      return bPath.length - aPath.length;
    });

    console.log('[api-builder] candidate endpoints:', candidates.map((c) => ({ id: c.id, path: c.path, method: c.method })));

  let matchRecord: any = null;
  let pathParams: Record<string, string> = {};
  const debugTrace: Array<any> = [];

    for (const ep of candidates) {
  const epMethod = (ep.method ?? 'GET').toUpperCase();
      if (epMethod !== method) continue; // method must match
  const epPath = normalizePath(ep.path ?? '/');
  const regex = templateToRegex(epPath);
      console.log(`[api-builder] trying candidate id=${ep.id} method=${epMethod} path=${epPath} regex=${regex}`);
      const m = regex.exec(requestedPath);
      console.log(`[api-builder] match result for id=${ep.id}:`, !!m);
      debugTrace.push({ id: ep.id, path: epPath, method: epMethod, regex: regex.toString(), matched: !!m });
      if (m) {
        matchRecord = ep;
        pathParams = (m.groups ?? {}) as Record<string, string>;
        break;
      }
    }

    if (!matchRecord) {
      // If debug requested, return the trace
      if (req.query && (req.query._dbg === '1' || req.query._dbg === 'true')) {
        res.status(404).json({ message: 'Endpoint not found', debug: { requestedPath, method, trace: debugTrace } });
        return;
      }
      res.status(404).json({ message: 'Endpoint not found' });
      return;
    }

    const ep = matchRecord;
    // build param values using endpoint.params definitions (may be null)
    const defs: any[] = ep.params ?? [];
    const values: Record<string, any> = {};

    // first fill from path captures
    for (const k of Object.keys(pathParams)) values[k] = pathParams[k];

    // then use defs to pick values from query/body/headers and apply defaults
    for (const d of defs) {
      const key = d.key;
      if (values[key] !== undefined) continue; // path already provided
      let raw: any;
      switch ((d.location ?? 'query')) {
        case 'path': raw = pathParams[key]; break;
        case 'query': raw = req.query[key]; break;
        case 'body': raw = req.body?.[key]; break;
        case 'header': raw = req.header(key) ?? req.header(key.toLowerCase()); break;
        default: raw = req.query[key];
      }
      raw = raw === undefined || raw === null || raw === '' ? d.default ?? raw : raw;
      if ((raw === undefined || raw === null || raw === '') && d.required) {
        res.status(400).json({ message: `Missing required parameter ${key}` });
        return;
      }
      if (raw !== undefined) values[key] = normalizeRawValue(raw);
    }

    // Normalize any path-derived values as well
    for (const k of Object.keys(values)) values[k] = normalizeRawValue(values[k]);

    // Type validation/conversion using helper
    for (const p of defs) {
      const key = p.key;
      const expectedType = p.type;
      const raw = values[key];
      if ((raw === undefined || raw === null || raw === '') && p.required) {
        return res.status(400).json({ message: `Missing required parameter: ${key}` });
      }
      if ((raw === undefined || raw === null || raw === '') && p.default !== undefined) {
        values[key] = p.default;
        continue;
      }
      if (raw === undefined || raw === null || raw === '') { values[key] = raw; continue; }
      try {
        values[key] = coerceByType(raw, expectedType);
      } catch (err: any) {
        return res.status(400).json({ message: `${err.message} for ${key}` });
      }
    }

    // Now substitute tokens in SQL
    // Heuristic: if endpoint has no explicit param defs, try to coerce token-like values
    // (path/query/body) into numbers/booleans/json/dates so they are not substituted as quoted strings.
    if ((!defs || defs.length === 0) && ep.sql && typeof ep.sql === 'string') {
      const tokens = extractTokensFromTemplate(ep.sql);
      for (const k of Object.keys(values)) {
        if (!tokens.includes(k)) continue;
        const raw = values[k];
        if (raw === undefined || raw === null) continue;
        if (typeof raw !== 'string') continue;
        const s = raw.trim();
        const low = s.toLowerCase();
        // integer
        if (/^-?\d+$/.test(s)) {
          values[k] = Number(s);
          continue;
        }
        // float
        if (/^-?\d+\.\d+$/.test(s)) {
          values[k] = Number(s);
          continue;
        }
        // boolean
        if (low === 'true' || low === 'false') {
          values[k] = low === 'true';
          continue;
        }
        // json object/array
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
          try { values[k] = JSON.parse(s); continue; } catch (e) { /* leave as string */ }
        }
        // ISO date-ish
        if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const d = new Date(s);
          if (!Number.isNaN(d.getTime())) { values[k] = d.toISOString(); continue; }
        }
      }
    }

    let sql: string = ep.sql;
    // If ep.sql is falsy, return 400
    if (!sql || typeof sql !== 'string') {
      res.status(400).json({ message: 'Endpoint has no SQL defined' });
      return;
    }

    // Replace each {key} with formatted SQL literal based on param type
    if (defs && defs.length > 0) {
      for (const d of defs) {
        const key = d.key;
        const v = values[key];
        const formatted = formatValueForSql(v ?? d.default, d.type);
        const re = new RegExp(`\\{${key}\\}`, 'g');
        sql = sql.replace(re, formatted);
      }
    } else {
      // still attempt to replace any tokens present from path/query/body
      const tokens = extractTokensFromTemplate(sql);
      for (const k of tokens) {
        const formatted = formatValueForSql(values[k], undefined);
        const re = new RegExp(`\\{${k}\\}`, 'g');
        sql = sql.replace(re, formatted);
      }
    }

    const trimmed = sql.trim();
    if (/^select\b/i.test(trimmed)) {
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(sql);
        if (!Array.isArray(rows)) {
          res.json({ rows: [], columns: [] });
          return;
        }
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        const rowValues = rows.map((r) => columns.map((c) => r[c]));
        res.json({ columns, rows: rowValues });
        return;
      } catch (err: any) {
        res.status(400).json({ message: 'Query failed', error: { message: err.message || String(err), details: err.code || err.meta || err } });
        return;
      }
    }

    try {
      const result = await prisma.$executeRawUnsafe(sql);
      res.json({ result });
      return;
    } catch (err: any) {
      res.status(400).json({ message: 'Execution failed', error: { message: err.message || String(err), details: err.code || err.meta || err } });
      return;
    }
  } catch (error) {
    next(error);
  }
};
