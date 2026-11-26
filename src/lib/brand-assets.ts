import purple from "@/assets/brand/io-main-purple.png.asset.json";
import dark from "@/assets/brand/io-dark-purple.png.asset.json";
import white from "@/assets/brand/myio-white.svg.asset.json";

/** Original official artwork, shared by CDE and future app uses. */
export const BRAND_ASSETS = [
  { key: "purple", label: "IO oficial · roxo", filename: "1-icon-main-purple@2x.png", url: purple.url, preview: "/erp-icons/official-purple/apple-touch-icon.png" },
  { key: "dark", label: "IO oficial · roxo escuro", filename: "3-icon-dark-purple@1x.png", url: dark.url, preview: "/erp-icons/official-dark/apple-touch-icon.png" },
  { key: "white", label: "Logo myio · fundo branco", filename: "bg-white@1x.svg", url: white.url, preview: white.url },
] as const;