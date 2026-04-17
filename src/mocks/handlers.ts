import { http, HttpResponse } from "msw";
import { products } from "./data/products";
import usersData from "@/data/users.json";
import {
  CartItem,
  CheckoutPayload,
  ShippingInfo,
  PaymentInfo,
  StoredUser,
  LoginPayload,
  SignupPayload,
} from "@/types";

let cartItems: CartItem[] = [];
let nextCartItemId = 1;

// In-memory user store seeded from users.json
const registeredUsers: StoredUser[] = [...(usersData.users as StoredUser[])];
let nextUserId = registeredUsers.length + 1;

// Active sessions (token -> userId) and revoked tokens (hard-invalidated on logout).
// Tokens embed the user ID so sessions can survive an MSW worker reload for
// seeded users (client keeps token in localStorage, handler parses user from token).
const sessions = new Map<string, string>();
const revokedTokens = new Set<string>();

function computeTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCart() {
  return { items: cartItems, total: computeTotal(cartItems) };
}

function publicUser(user: StoredUser) {
  return { id: user.id, name: user.name, email: user.email };
}

function generateToken(userId: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `token-${userId}-${Date.now()}-${random}`;
}

function userIdFromToken(token: string): string | null {
  // Format: token-{userId}-{timestamp}-{random}
  // userId itself may contain hyphens (e.g. "user-001"), so reconstruct by
  // stripping the trailing `-{timestamp}-{random}` suffix.
  const parts = token.split("-");
  if (parts.length < 4 || parts[0] !== "token") return null;
  return parts.slice(1, parts.length - 2).join("-");
}

function getUserFromRequest(request: Request): StoredUser | null {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || revokedTokens.has(token)) return null;

  // Fast path: active session map.
  const userId = sessions.get(token) || userIdFromToken(token);
  if (!userId) return null;

  return registeredUsers.find((u) => u.id === userId) || null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handlers = [
  // GET /api/products
  http.get("/api/products", ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const category = url.searchParams.get("category") || "";
    const sort = url.searchParams.get("sort") || "";

    let result = [...products];

    if (search) {
      result = result.filter((p) => p.name.toLowerCase().includes(search));
    }

    if (category) {
      result = result.filter((p) => p.category === category);
    }

    if (sort === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    }

    return HttpResponse.json({ products: result });
  }),

  // GET /api/products/:id
  http.get("/api/products/:id", ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    return HttpResponse.json({ product });
  }),

  // GET /api/cart
  http.get("/api/cart", () => {
    return HttpResponse.json(getCart());
  }),

  // POST /api/cart
  http.post("/api/cart", async ({ request }) => {
    const body = (await request.json()) as {
      productId: string;
      quantity: number;
    };
    const product = products.find((p) => p.id === body.productId);

    if (!product) {
      return HttpResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const existing = cartItems.find((item) => item.productId === body.productId);

    if (existing) {
      existing.quantity += body.quantity || 1;
    } else {
      cartItems.push({
        id: `cart-${nextCartItemId++}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: body.quantity || 1,
        image: product.image,
      });
    }

    return HttpResponse.json(getCart());
  }),

  // PATCH /api/cart/:id
  http.patch("/api/cart/:id", async ({ params, request }) => {
    const body = (await request.json()) as { quantity: number };
    const itemIndex = cartItems.findIndex((item) => item.id === params.id);

    if (itemIndex === -1) {
      return HttpResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    if (body.quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      cartItems[itemIndex].quantity = body.quantity;
    }

    return HttpResponse.json(getCart());
  }),

  // DELETE /api/cart/:id
  http.delete("/api/cart/:id", ({ params }) => {
    const itemIndex = cartItems.findIndex((item) => item.id === params.id);

    if (itemIndex === -1) {
      return HttpResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    cartItems.splice(itemIndex, 1);
    return HttpResponse.json(getCart());
  }),

  // POST /api/auth/signup
  http.post("/api/auth/signup", async ({ request }) => {
    const body = (await request.json()) as SignupPayload;
    const errors: Record<string, string> = {};

    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!name) errors.name = "Name is required";
    if (!email) {
      errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Invalid email format";
    } else if (
      registeredUsers.some((u) => u.email.toLowerCase() === email)
    ) {
      errors.email = "Email is already registered";
    }
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ errors }, { status: 400 });
    }

    const newUser: StoredUser = {
      id: `user-${String(nextUserId++).padStart(3, "0")}`,
      name,
      email,
      password,
    };
    registeredUsers.push(newUser);

    const token = generateToken(newUser.id);
    sessions.set(token, newUser.id);

    return HttpResponse.json(
      { user: publicUser(newUser), token },
      { status: 201 }
    );
  }),

  // POST /api/auth/login
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as LoginPayload;
    const errors: Record<string, string> = {};

    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!email) errors.email = "Email is required";
    else if (!EMAIL_REGEX.test(email)) errors.email = "Invalid email format";
    if (!password) errors.password = "Password is required";

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ errors }, { status: 400 });
    }

    const user = registeredUsers.find(
      (u) => u.email.toLowerCase() === email
    );

    if (!user || user.password !== password) {
      return HttpResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = generateToken(user.id);
    sessions.set(token, user.id);

    return HttpResponse.json({ user: publicUser(user), token });
  }),

  // POST /api/auth/logout
  http.post("/api/auth/logout", ({ request }) => {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) {
      sessions.delete(token);
      revokedTokens.add(token);
    }
    return HttpResponse.json({ success: true });
  }),

  // GET /api/auth/me
  http.get("/api/auth/me", ({ request }) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return HttpResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    return HttpResponse.json({ user: publicUser(user) });
  }),

  // POST /api/checkout
  http.post("/api/checkout", async ({ request }) => {
    const body = (await request.json()) as CheckoutPayload;
    const errors: Record<string, string> = {};

    // Validate shipping
    const shipping: ShippingInfo = body.shipping || ({} as ShippingInfo);
    if (!shipping.firstName?.trim()) errors.firstName = "First name is required";
    if (!shipping.lastName?.trim()) errors.lastName = "Last name is required";
    if (!shipping.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      errors.email = "Invalid email format";
    }
    if (!shipping.address?.trim()) errors.address = "Address is required";
    if (!shipping.city?.trim()) errors.city = "City is required";
    if (!shipping.state?.trim()) errors.state = "State is required";
    if (!shipping.zipCode?.trim()) {
      errors.zipCode = "Zip code is required";
    } else if (!/^\d{5}$/.test(shipping.zipCode)) {
      errors.zipCode = "Zip code must be 5 digits";
    }

    // Validate payment
    const payment: PaymentInfo = body.payment || ({} as PaymentInfo);
    const cardDigits = payment.cardNumber?.replace(/\s/g, "") || "";
    if (!cardDigits) {
      errors.cardNumber = "Card number is required";
    } else if (!/^\d{16}$/.test(cardDigits)) {
      errors.cardNumber = "Card number must be 16 digits";
    }
    if (!payment.expiryDate?.trim()) {
      errors.expiryDate = "Expiry date is required";
    } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(payment.expiryDate)) {
      errors.expiryDate = "Expiry must be MM/YY format";
    }
    if (!payment.cvv?.trim()) {
      errors.cvv = "CVV is required";
    } else if (!/^\d{3,4}$/.test(payment.cvv)) {
      errors.cvv = "CVV must be 3 or 4 digits";
    }
    if (!payment.nameOnCard?.trim())
      errors.nameOnCard = "Name on card is required";

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ errors }, { status: 400 });
    }

    if (cartItems.length === 0) {
      return HttpResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const order = {
      orderId: `ORD-${Date.now()}`,
      items: [...cartItems],
      total: computeTotal(cartItems),
      shipping,
      status: "confirmed" as const,
      createdAt: new Date().toISOString(),
    };

    // Clear cart after successful checkout
    cartItems = [];
    nextCartItemId = 1;

    return HttpResponse.json({ order });
  }),
];
