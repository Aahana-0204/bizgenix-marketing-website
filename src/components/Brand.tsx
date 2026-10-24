import Image from "next/image";
export function Brand({ logo }: { logo: boolean }) {
  return (
    <a href="#top" className="brand" aria-label="Bizgenix AI CRM home">
      {logo ? (
        <Image
          src="/brand/bizgenix-logo.svg"
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
