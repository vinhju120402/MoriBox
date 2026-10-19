'use client';

import { useCallback, useEffect, useState } from 'react';
import { PRODUCTS, Product } from '../app/data/products';

const CUSTOM_KEY = 'moribox_custom_products';
const EDITS_KEY = 'moribox_product_edits';
const DELETED_KEY = 'moribox_deleted_product_ids';
// Same-tab sync event, mirroring the pattern in use-stock-overrides — so the
// admin Kho page and every storefront page reading the catalog stay in sync
// the moment a product is added, edited, or deleted.
const CATALOG_EVENT = 'moribox-catalog-updated';

function readCustom(): Product[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readEdits(): Record<string, Partial<Product>> {
  try {
    const raw = localStorage.getItem(EDITS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readDeleted(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// The seed PRODUCTS array plus everything an admin has added/edited/deleted
// locally — this is the single source of truth every page should read from,
// so admin changes on this browser show up consistently across the site.
function buildCatalog(): Product[] {
  const custom = readCustom();
  const edits = readEdits();
  const deleted = new Set(readDeleted());
  return [...PRODUCTS, ...custom]
    .filter(p => !deleted.has(p.id))
    .map(p => (edits[p.id] ? { ...p, ...edits[p.id] } : p));
}

export function useProductCatalog() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  // Until this flips true, `products` is only the static seed list — pages
  // looking up a single (possibly admin-added) product by id must wait for
  // it before deciding the product doesn't exist, or a custom product 404s
  // on first render before localStorage has been read.
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProducts(buildCatalog());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasLoaded(true);
    const handleUpdate = () => setProducts(buildCatalog());
    window.addEventListener(CATALOG_EVENT, handleUpdate);
    return () => window.removeEventListener(CATALOG_EVENT, handleUpdate);
  }, []);

  const notify = () => {
    setProducts(buildCatalog());
    window.dispatchEvent(new Event(CATALOG_EVENT));
  };

  const addProduct = useCallback((product: Product) => {
    const custom = readCustom();
    localStorage.setItem(CUSTOM_KEY, JSON.stringify([...custom, product]));
    notify();
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const custom = readCustom();
    const idx = custom.findIndex(p => p.id === id);
    if (idx > -1) {
      custom[idx] = { ...custom[idx], ...updates };
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    } else {
      const edits = readEdits();
      edits[id] = { ...edits[id], ...updates };
      localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
    }
    notify();
  }, []);

  const deleteProduct = useCallback((id: string) => {
    const custom = readCustom();
    if (custom.some(p => p.id === id)) {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom.filter(p => p.id !== id)));
    } else {
      const deleted = readDeleted();
      if (!deleted.includes(id)) {
        localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted, id]));
      }
    }
    notify();
  }, []);

  return { products, hasLoaded, addProduct, updateProduct, deleteProduct };
}
