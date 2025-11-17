export default function TokenIcon({ className = "", alt = "SureStack Token", ...props }) {
  return (
    <img
      src="/assets/token/sst-token.png"
      alt={alt}
      className={`inline-block h-5 w-5 ${className}`.trim()}
      {...props}
    />
  );
}

