import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS, type Product } from "../../lib/products";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  const product = PRODUCTS.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = PRODUCTS.filter(
    (item) =>
      item.slug !== product.slug && item.category === product.category
  ).slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/marketplace"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Volver al marketplace
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <CategoryBadge value={product.category} />
              <PriorityBadge value={product.priority} />
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
              {product.productName}
            </h1>

            <p className="mt-3 text-lg text-slate-500">{product.brand}</p>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Suplemento
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {product.supplementName}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-slate-900">
                Descripción
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                {product.description}
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Categoría"
                value={translateCategory(product.category)}
              />
              <InfoCard
                label="Prioridad"
                value={translatePriority(product.priority)}
              />
              <InfoCard
                label="Marca"
                value={product.brand}
              />
              <InfoCard
                label="Precio estimado"
                value={product.price}
              />
            </div>

            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              Esta información es orientativa y educativa. No sustituye una
              consulta médica, diagnóstico ni tratamiento profesional.
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Precio estimado
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900">
                {product.price}
              </div>

              <a
                href={product.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex w-full justify-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Ver producto
              </a>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                ¿Cuándo suele recomendarse?
              </h2>

              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <li>• Cuando coincide con un objetivo específico del usuario.</li>
                <li>• Cuando el perfil sugiere una necesidad de apoyo puntual.</li>
                <li>• Como parte de una estrategia general de bienestar.</li>
              </ul>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900">
              Productos relacionados
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((item) => (
                <RelatedProductCard key={item.slug} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function RelatedProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/marketplace/${product.slug}`}
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
    >
      <div className="flex flex-wrap gap-2">
        <CategoryBadge value={product.category} />
      </div>

      <h3 className="mt-4 text-xl font-semibold text-slate-900">
        {product.productName}
      </h3>

      <p className="mt-2 text-sm text-slate-500">{product.brand}</p>

      <p className="mt-4 leading-7 text-slate-600">
        {product.supplementName}
      </p>

      <div className="mt-5 text-lg font-semibold text-slate-900">
        {product.price}
      </div>
    </Link>
  );
}

function CategoryBadge({ value }: { value: Product["category"] }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {translateCategory(value)}
    </span>
  );
}

function PriorityBadge({ value }: { value: Product["priority"] }) {
  const styles =
    value === "high"
      ? "bg-red-100 text-red-700"
      : value === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {translatePriority(value)}
    </span>
  );
}

function translateCategory(value: Product["category"]) {
  const labels: Record<Product["category"], string> = {
    energy: "Energía",
    stress: "Estrés",
    sleep: "Sueño",
    focus: "Enfoque",
    general: "Salud general",
  };

  return labels[value];
}

function translatePriority(value: Product["priority"]) {
  const labels: Record<Product["priority"], string> = {
    high: "Prioridad alta",
    medium: "Prioridad media",
    low: "Prioridad baja",
  };

  return labels[value];
}