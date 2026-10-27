import Image from "next/image";
export function Brand({
  logo,
  logoFormat,
}: {
  logo: boolean;
  logoFormat?: "svg" | "png" | "jpg" | null;
}) {
  const logoSrc =
    logoFormat === "svg"
      ? "/brand/bizgenix-logo.svg"
      : logoFormat === "png"
        ? "/brand/bizgenix-logo.png"
        : "/brand/bizgenix-logo.jpg";
  return (
    <a href="#top" className="brand" aria-label="Bizgenix AI CRM home">
      {logo ? (
        <Image
          src={logoSrc}
          alt="Bizgenix AI"
          width={200}
          height={55}
          priority
        />
      ) : (
        <span className="brand-wordmark">
          BIZGENIX <strong>AI</strong>
        </span>
      )}
      <span className="brand-divider" />
      <span className="brand-product">CRM</span>
    </a>
  );
}
