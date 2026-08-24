import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Languages,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/ui/LanguageSwitcher.jsx";
import { dashboardAssets } from "../data/dashboardAssets.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { getRoleDestination } from "../routes/routeGuards.jsx";
import { useAuthStore } from "../store/authStore.js";

const products = [
  {
    id: "sat",
    title: "SAT",
    icon: BookOpen,
    asset: dashboardAssets.exam,
    available: true,
  },
  {
    id: "ielts",
    title: "IELTS",
    icon: Languages,
    asset: dashboardAssets.pen,
    available: false,
  },
  {
    id: "university",
    title: "University",
    icon: GraduationCap,
    asset: dashboardAssets.hat,
    available: false,
  },
];

export default function ProductSelectPage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  function openProduct(product) {
    if (!product.available) return;
    navigate(user ? getRoleDestination(user) : "/login?product=sat");
  }

  return (
    <main className="product-gateway">
      <header className="product-gateway-nav">
        <Link className="marketing-brand" to="/">
          <img src="/monoprep-logo.png" alt="" />
          <span>MonoPrep</span>
        </Link>
        <LanguageSwitcher />
      </header>
      <section className="product-gateway-content">
        <div className="product-gateway-header">
          {" "}
          <Link className="product-back" to="/">
            <ArrowLeft aria-hidden="true" /> {t("product.back")}
          </Link>
          <span className="product-eyebrow">{t("product.eyebrow")}</span>
        </div>

        <h1>{t("product.title")}</h1>
        <p>{t("product.subtitle")}</p>
        <div className="product-grid">
          {products.map((product, index) => {
            const Icon = product.icon;
            return (
              <motion.button
                key={product.id}
                type="button"
                className={`product-option product-${product.id} ${
                  product.available ? "available" : "coming"
                }`.trim()}
                disabled={!product.available}
                onClick={() => openProduct(product)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                <span className="product-status">
                  {t(
                    product.available ? "product.available" : "product.coming"
                  )}
                </span>
                <img src={product.asset} alt="" />
                <Icon aria-hidden="true" />
                <h2>{product.title}</h2>
                <p>{t(`product.${product.id}.copy`)}</p>
                <span className="product-open-label">
                  {product.available ? t("product.open") : t("product.coming")}
                  {product.available ? <ArrowRight aria-hidden="true" /> : null}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
