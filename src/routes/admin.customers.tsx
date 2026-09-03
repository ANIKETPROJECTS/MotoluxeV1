import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { AdminCustomerDetail, AdminCustomerListItem } from "@/lib/server/admin-customers";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Motoluxe Admin" },
      { name: "description", content: "Manage Motoluxe customer accounts and order history." },
    ],
  }),
  component: AdminCustomersPage,
});

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
};

type CustomerListResponse = {
  customers?: AdminCustomerListItem[];
  summary?: {
    registered: number;
    withOrders: number;
    totalSales: number;
  };
  filters?: { cities: string[]; states: string[] };
  error?: string;
};

const blankCustomer: CustomerForm = { name: "", phone: "", email: "" };

const inputClass =
  "w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusClass(value: string) {
  if (value === "paid" || value === "delivered") {
    return "border-accent/50 bg-accent/15 text-accent-foreground";
  }
  if (value === "cancelled" || value === "rejected" || value === "failed") {
    return "border-primary/40 bg-primary/10 text-primary";
  }
  return "border-border bg-background text-muted-foreground";
}

function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([]);
  const [summary, setSummary] = useState({ registered: 0, withOrders: 0, totalSales: 0 });
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [activity, setActivity] = useState("");
  const [paid, setPaid] = useState("");
  const [sort, setSort] = useState("joined");
  const [direction, setDirection] = useState("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [editor, setEditor] = useState<CustomerForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadCustomers() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (city) params.set("city", city);
      if (state) params.set("state", state);
      if (activity) params.set("activity", activity);
      if (paid) params.set("paid", paid);
      params.set("sort", sort);
      params.set("direction", direction);
      const response = await fetch(`/api/admin/customers?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as CustomerListResponse;
      if (!response.ok) throw new Error(payload.error ?? "We could not load customers.");
      setCustomers(payload.customers ?? []);
      setSummary(payload.summary ?? { registered: 0, withOrders: 0, totalSales: 0 });
      setCities(payload.filters?.cities ?? []);
      setStates(payload.filters?.states ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load customers.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetail(null);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers/${id}`, { credentials: "same-origin" });
      const payload = (await response.json().catch(() => ({}))) as {
        customer?: AdminCustomerDetail;
        error?: string;
      };
      if (!response.ok || !payload.customer) {
        throw new Error(payload.error ?? "We could not load this customer.");
      }
      setDetail(payload.customer);
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "We could not load this customer.",
      );
    }
  }

  useEffect(() => {
    void loadCustomers();
    // The initial load intentionally captures the default filters once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingId(null);
    setEditor(blankCustomer);
    setError("");
    setNotice("");
  }

  function openEdit(customer: AdminCustomerListItem) {
    setEditingId(customer.id);
    setEditor({
      name: customer.name === "Unnamed customer" ? "" : customer.name,
      phone: customer.phone,
      email: customer.email,
    });
    setError("");
    setNotice("");
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editingId ? `/api/admin/customers/${editingId}` : "/api/admin/customers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(editor),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not save this customer.");
      const message = editingId ? "Customer details updated." : "Customer added.";
      const savedId = editingId;
      setEditor(null);
      setNotice(message);
      await loadCustomers();
      if (savedId) await loadDetail(savedId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save this customer.");
    } finally {
      setWorking(false);
    }
  }

  async function archiveCustomer(customer: AdminCustomerListItem) {
    if (
      !window.confirm(
        `Archive ${customer.name}? They will no longer appear in the customer directory.`,
      )
    ) {
      return;
    }
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not archive this customer.");
      setSelectedId(null);
      setDetail(null);
      setNotice("Customer archived.");
      await loadCustomers();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "We could not archive this customer.",
      );
    } finally {
      setWorking(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setCity("");
    setState("");
    setActivity("");
    setPaid("");
    setSort("joined");
    setDirection("desc");
    window.setTimeout(() => void loadCustomers(), 0);
  }

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow text-primary">Customer directory</span>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Customers.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            One secure view of customer profiles, activity, wishlists, and order history.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground"
        >
          Add customer
        </button>
      </header>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-accent/50 bg-accent/15 text-accent-foreground"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Registered customers" value={summary.registered} />
        <SummaryCard label="Customers with orders" value={summary.withOrders} />
        <SummaryCard label="Total customer sales" value={formatMoney(summary.totalSales)} accent />
      </div>

      <section className="border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow text-primary">Directory controls</span>
            <h2 className="mt-2 text-2xl font-semibold">Find the right customer.</h2>
          </div>
          {(search ||
            city ||
            state ||
            activity ||
            paid ||
            sort !== "joined" ||
            direction !== "desc") && (
            <button
              type="button"
              onClick={clearFilters}
              className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-primary"
            >
              Clear filters
            </button>
          )}
        </div>
        <form
          className="mt-6 grid gap-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr_110px]"
          onSubmit={(event) => {
            event.preventDefault();
            void loadCustomers();
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, or email"
            className={inputClass}
            aria-label="Search customers"
          />
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={inputClass}
            aria-label="Filter by city"
          >
            <option value="">All cities</option>
            {cities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
            className={inputClass}
            aria-label="Filter by state"
          >
            <option value="">All states</option>
            {states.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            className={inputClass}
            aria-label="Filter by activity"
          >
            <option value="">All activity</option>
            <option value="recent">Active in 90 days</option>
            <option value="never">No activity recorded</option>
          </select>
          <select
            value={paid}
            onChange={(event) => setPaid(event.target.value)}
            className={inputClass}
            aria-label="Filter by paid orders"
          >
            <option value="">All payment history</option>
            <option value="yes">Has paid order</option>
            <option value="no">No paid order</option>
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className={inputClass}
            aria-label="Sort customers"
          >
            <option value="joined">Joined date</option>
            <option value="activity">Last activity</option>
            <option value="orders">Order count</option>
            <option value="spent">Total spent</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setDirection((value) => (value === "desc" ? "asc" : "desc"));
              window.setTimeout(() => void loadCustomers(), 0);
            }}
            className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-primary hover:text-primary"
          >
            {direction === "desc" ? "Descending" : "Ascending"}
          </button>
        </form>
      </section>

      <div className={selectedId ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" : ""}>
        <section className="border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
            <div>
              <span className="eyebrow text-primary">Live records</span>
              <p className="mt-1 text-sm text-muted-foreground">
                Showing {customers.length} of up to 500 customers
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-primary"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="p-10 text-sm text-muted-foreground">Loading customers…</div>
          ) : customers.length === 0 ? (
            <div className="p-10">
              <h2 className="text-xl font-semibold">No customers match these filters.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                New customer accounts created from the storefront will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-background text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-medium sm:px-7">Customer</th>
                    <th className="px-4 py-4 font-medium">Phone</th>
                    <th className="px-4 py-4 font-medium">Orders</th>
                    <th className="px-4 py-4 font-medium">Total spent</th>
                    <th className="px-4 py-4 font-medium">Joined</th>
                    <th className="px-4 py-4 font-medium">Activity</th>
                    <th className="px-4 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={selectedId === customer.id ? "bg-primary/5" : ""}
                    >
                      <td className="px-5 py-4 sm:px-7">
                        <button
                          type="button"
                          onClick={() => void loadDetail(customer.id)}
                          className="flex items-center gap-3 text-left hover:text-primary"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 font-display text-xs text-primary">
                            {initials(customer.name) || "CU"}
                          </span>
                          <span>
                            <span className="block font-medium text-foreground">
                              {customer.name}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {customer.email || "Email not provided"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{customer.phone}</td>
                      <td className="px-4 py-4 text-foreground">{customer.orderCount}</td>
                      <td className="px-4 py-4 text-foreground">
                        {customer.totalSpent ? formatMoney(customer.totalSpent) : "Not priced"}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatDate(customer.joinedAt)}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatDate(customer.lastActivityAt)}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void loadDetail(customer.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedId && (
          <CustomerDetail
            customer={detail}
            onClose={() => {
              setSelectedId(null);
              setDetail(null);
            }}
            onEdit={(customer) => openEdit(customer)}
            onArchive={(customer) => void archiveCustomer(customer)}
            working={working}
          />
        )}
      </div>

      {editor && (
        <section className="border border-primary/40 bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow text-primary">
                {editingId ? "Edit customer" : "Add customer"}
              </span>
              <h2 className="mt-2 text-2xl font-semibold">
                {editingId ? "Update customer details." : "Create a customer record."}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditor(null)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={saveCustomer} className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="text-xs text-muted-foreground">
              Full name
              <input
                required
                value={editor.name}
                onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Phone
              <input
                required
                value={editor.phone}
                onChange={(event) => setEditor({ ...editor, phone: event.target.value })}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Email (optional)
              <input
                type="email"
                value={editor.email}
                onChange={(event) => setEditor({ ...editor, email: event.target.value })}
                className={`${inputClass} mt-2`}
              />
            </label>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={working}
                className="bg-primary px-5 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-50"
              >
                {working ? "Saving" : editingId ? "Save changes" : "Create customer"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className={`border bg-card p-5 sm:p-6 ${accent ? "border-accent/50" : "border-border"}`}>
      <span className="eyebrow text-muted-foreground">{label}</span>
      <p
        className={`mt-4 text-3xl font-bold ${accent ? "text-accent-foreground" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function CustomerDetail({
  customer,
  onClose,
  onEdit,
  onArchive,
  working,
}: {
  customer: AdminCustomerDetail | null;
  onClose: () => void;
  onEdit: (customer: AdminCustomerListItem) => void;
  onArchive: (customer: AdminCustomerListItem) => void;
  working: boolean;
}) {
  if (!customer) {
    return (
      <aside className="border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading customer details…</p>
      </aside>
    );
  }

  return (
    <aside className="border border-border bg-card">
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-12 w-12 place-items-center bg-primary/10 font-display text-sm text-primary">
            {initials(customer.name) || "CU"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
          >
            Close
          </button>
        </div>
        <h2 className="mt-5 text-2xl font-semibold">{customer.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {customer.email || "Email not provided"}
        </p>
        <div className="mt-5 grid gap-2 text-sm">
          <DetailRow label="Phone" value={customer.phone} />
          <DetailRow
            label="Location"
            value={[customer.city, customer.state].filter(Boolean).join(", ") || "Not recorded"}
          />
          <DetailRow label="Joined" value={formatDate(customer.joinedAt)} />
          <DetailRow label="Last activity" value={formatDate(customer.lastActivityAt)} />
          <DetailRow label="Verification" value={customer.verification} />
          <DetailRow
            label="Wishlist"
            value={`${customer.wishlistCount} item${customer.wishlistCount === 1 ? "" : "s"}`}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="border border-primary px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={working}
            onClick={() => onArchive(customer)}
            className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            Archive
          </button>
        </div>
      </div>
      <div className="p-6">
        <span className="eyebrow text-primary">Purchase history</span>
        {customer.orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No orders are linked to this customer.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {customer.orders.map((order) => (
              <div key={order.id} className="border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/admin/orders"
                      search={{ search: order.id }}
                      className="font-display text-xs uppercase tracking-[0.12em] text-primary hover:underline"
                    >
                      {order.number}
                    </Link>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(order.date)} · {order.itemCount} items
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {order.total === null ? "Request price" : formatMoney(order.total)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${statusClass(order.status)}`}
                  >
                    {order.status.replaceAll("_", " ")}
                  </span>
                  <span
                    className={`border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${statusClass(order.paymentStatus)}`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}
