import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export const listEndpoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.endpoints.findMany({ orderBy: { created_at: 'desc' } });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getEndpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.endpoints.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const createEndpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, method, path, sql, params } = req.body;
    const created = await prisma.endpoints.create({ data: { name, method, path, sql, params } });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const updateEndpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { name, method, path, sql, params } = req.body;
    const updated = await prisma.endpoints.update({ where: { id }, data: { name, method, path, sql, params } });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Not found' });
    next(error);
  }
};

export const deleteEndpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const deleted = await prisma.endpoints.delete({ where: { id } });
    res.json(deleted);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Not found' });
    next(error);
  }
};
