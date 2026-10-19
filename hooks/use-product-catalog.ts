'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { PRODUCTS, Product, GradeCode } from '../app/data/products';
import { getSupabase } from '../lib/supabase';
import { resolveImage } from '../lib/storage';

interface ProductRow {
  id: string;
  name: string;
  grade: GradeCode;
  scale: string;
  series: string;
  price: number;
  sale_price: number | null;
  image: string;
  images: string[];
  stock: number;
  low_stock_threshold: number | null;
  is_new: boolean;
  is_best_seller: boolean;
  specs: Product['specs'];
  description: string;
}

const fromRow = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  grade: r.grade,
  scale: r.scale,
  series: r.series,
  price: r.price,
  salePrice: r.sale_price ?? undefined,
  image: r.image,
  images: r.images?.length ? r.images : undefined,
  stock: r.stock,
  lowStockThreshold: r.low_stock_threshold ?? undefined,
  isNew: r.is_new,
  isBestSeller: r.is_best_seller,
  specs: r.specs,
  description: r.description,
});

const toRow = (p: Partial<Product>): Partial<ProductRow> => {
  const row: Partial<ProductRow> = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.name !== undefined) row.name = p.name;
  if (p.grade !== undefined) row.grade = p.grade;
  if (p.scale !== undefined) row.scale = p.scale;
  if (p.series !== undefined) row.series = p.series;
  if (p.price !== undefined) row.price = p.price;
  if ('salePrice' in p) row.sale_price = p.salePrice ?? null;
  if (p.image !== undefined) row.image = p.image;
  if (p.images !== undefined) row.images = p.images;
  if (p.stock !== undefined) row.stock = p.stock;
  if (p.lowStockThreshold !== undefined) row.low_stock_threshold = p.lowStockThreshold;
  if (p.isNew !== undefined) row.is_new = p.isNew;
  if (p.isBestSeller !== undefined) row.is_best_seller = p.isBestSeller;
  if (p.specs !== undefined) row.specs = p.specs;
  if (p.description !== undefined) row.description = p.description;
  return row;
};

// ── Shared catalog store (Supabase `products` table) ─────────────────
// Until the first fetch resolves, `products` is the static seed list so the
// storefront never flashes empty; `hasLoaded` flips once the DB answered.
interface CatalogState {
  products: Product[];
  hasLoaded: boolean;
}

const SERVER_STATE: CatalogState = { products: PRODUCTS, hasLoaded: false };
let state: CatalogState = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: CatalogState) {
  state = next;
  listeners.forEach(l => l());
}

// Re-reads the catalog from the database (e.g. after checkout changed stock).
export async function refreshCatalog() {
  const { data, error } = await getSupabase().from('products').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to load products', error.message);
    // Keep whatever we already show (seed list on first load).
    setState({ ...state, hasLoaded: true });
    return;
  }
  setState({ products: (data as ProductRow[]).map(fromRow), hasLoaded: true });
}

function subscribe(cb: () => void) {
  if (!started && typeof window !== 'undefined') {
    started = true;
    void refreshCatalog();
  }
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

const getSnapshot = () => state;
const getServerSnapshot = () => SERVER_STATE;

// Photos picked in the admin form arrive as data URLs; store them in Supabase
// Storage and keep only the public URL in the database.
async function withUploadedImages<T extends Partial<Product>>(p: T): Promise<T> {
  const next = { ...p };
  if (typeof next.image === 'string') next.image = await resolveImage(next.image);
  if (next.images) next.images = await Promise.all(next.images.map(resolveImage));
  return next;
}

export type CatalogResult = { ok: true } | { ok: false; error: string };

export function useProductCatalog() {
  const { products, hasLoaded } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mutations require an admin session — RLS rejects anyone else server-side.
  const addProduct = useCallback(async (product: Product): Promise<CatalogResult> => {
    const { error } = await getSupabase().from('products').insert(toRow(await withUploadedImages(product)));
    if (error) return { ok: false, error: error.message };
    await refreshCatalog();
    return { ok: true };
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<CatalogResult> => {
    const { error } = await getSupabase().from('products').update(toRow(await withUploadedImages(updates))).eq('id', id);
    if (error) return { ok: false, error: error.message };
    await refreshCatalog();
    return { ok: true };
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<CatalogResult> => {
    const { error } = await getSupabase().from('products').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    await refreshCatalog();
    return { ok: true };
  }, []);

  return { products, hasLoaded, addProduct, updateProduct, deleteProduct };
}
