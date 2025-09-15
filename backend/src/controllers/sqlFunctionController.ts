import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

// Create a SQL function record
export const createSqlFunction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, query } = req.body;
    // Run SQL execution and persistence inside an interactive transaction so they rollback together on failure
    try {
      const created = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(query);
        const rec = await tx.sql_functions.create({ data: { name, query } });
        return rec;
      });
      res.status(201).json(created);
    } catch (execErr: any) {
      res.status(400).json({ message: 'Failed to create function in database or persist record', error: execErr.message || execErr });
      return;
    }
  } catch (error) {
    next(error);
  }
};

// List all SQL functions
export const listSqlFunctions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.sql_functions.findMany({ orderBy: { created_at: 'desc' } });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

// Get one by id
export const getSqlFunction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.sql_functions.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
};

// Update
export const updateSqlFunction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { name, query } = req.body;
    // Run the SQL and update the record inside a transaction so both steps are atomic
    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(query);
        const rec = await tx.sql_functions.update({ where: { id }, data: { name, query } });
        return rec;
      });
      res.json(updated);
    } catch (execErr: any) {
      res.status(400).json({ message: 'Failed to apply function SQL in database or update record', error: execErr.message || execErr });
      return;
    }
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    next(error);
  }
};

// Delete
export const deleteSqlFunction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const deleted = await prisma.sql_functions.delete({ where: { id } });
    res.json(deleted);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    next(error);
  }
};

// Execute arbitrary SQL sent from the frontend and return a friendly JSON result.
// NOTE: This runs the raw SQL using Prisma's unsafe helpers. This demo assumes
// a trusted development environment. Never expose this in production.
export const runSql = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sql } = req.body;
    if (typeof sql !== 'string' || !sql.trim()) {
      res.status(400).json({ message: 'Missing sql in request body' });
      return;
    }

    const trimmed = sql.trim();
    // Basic heuristic: if it starts with SELECT, treat as a query that returns rows
    if (/^select\b/i.test(trimmed)) {
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(sql);
        // Convert array of objects -> { columns: string[], rows: any[][] }
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

    // For non-select statements, execute and return affected count or generic result
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
