"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartProduct = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: string | null;
};

export type CartItem = CartProduct & { quantity: number };

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  drawerOpen: boolean;
  itemCount: number;
  subtotal: number;
  hasUnknownPrices: boolean;
  addItem: (product: CartProduct, quantity?: number, openDrawer?: boolean) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "shopping-china-brasil-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  function commit(next: CartItem[]) {
    setItems(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addItem(product: CartProduct, quantity = 1, openDrawer = true) {
    const safeQuantity = Math.max(1, Math.min(99, Math.floor(quantity)));
    const current = items.find((item) => item.id === product.id);
    const next = current
      ? items.map((item) => item.id === product.id ? { ...item, quantity: Math.min(99, item.quantity + safeQuantity) } : item)
      : [...items, { ...product, quantity: safeQuantity }];
    commit(next);
    if (openDrawer) setDrawerOpen(true);
  }

  function removeItem(id: string) {
    commit(items.filter((item) => item.id !== id));
  }

  function setQuantity(id: string, quantity: number) {
    if (quantity <= 0) return removeItem(id);
    commit(items.map((item) => item.id === id ? { ...item, quantity: Math.min(99, Math.floor(quantity)) } : item));
  }

  function clearCart() {
    commit([]);
  }

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    drawerOpen,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + (priceToNumber(item.price) ?? 0) * item.quantity, 0),
    hasUnknownPrices: items.some((item) => priceToNumber(item.price) === null),
    addItem,
    removeItem,
    setQuantity,
    clearCart,
    openCart: () => setDrawerOpen(true),
    closeCart: () => setDrawerOpen(false),
  }), [items, hydrated, drawerOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

export function priceToNumber(price: string | null) {
  if (!price) return null;
  const normalized = price.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function isCartItem(value: CartItem) {
  return Boolean(value && typeof value.id === "string" && typeof value.slug === "string" && typeof value.title === "string" && Number.isFinite(value.quantity));
}
