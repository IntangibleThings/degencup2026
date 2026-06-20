export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#16213E', padding: '32px 24px' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>
          &copy; 2026 DEGEN WORLD CUP 2026 | NOT AFFILIATED WITH FIFA
        </span>
        <span className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>
          MADE WITH &#9917; + &#127916;
        </span>
        <span className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>
          WORLD CUP 2026: JUN 11 - JUL 19
        </span>
      </div>
    </footer>
  );
}
