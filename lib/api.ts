const BASE_URL = process.env.NEXT_PUBLIC_STORE_API_URL;
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

const adminHeaders = {
  "Content-Type": "application/json",
  "x-admin-key": ADMIN_KEY || "",
};

// ───── PRODUCTS ─────
export async function getProducts(params = {}) {
  const query = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${BASE_URL}/products?${query}`, {
    headers: adminHeaders,
  });
  return res.json();
}

export async function createProduct(data: object) {
  const res = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProduct(id: string, data: object) {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  return res.json();
}

// ───── ORDERS ─────
export async function getOrders(params = {}) {
  const query = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${BASE_URL}/orders?${query}`, {
    headers: adminHeaders,
  });
  return res.json();
}

export async function updateOrder(id: string, data: object) {
  const res = await fetch(`${BASE_URL}/orders/${id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(data),
  });
  return res.json();
}

// ───── USERS ─────
export async function getUsers(params = {}) {
  const query = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${BASE_URL}/users?${query}`, {
    headers: adminHeaders,
  });
  return res.json();
}