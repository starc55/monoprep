import MathJaxContent from '../math/MathJaxContent.jsx';

const REFERENCE_ITEMS = [
  { id: 'circle', title: 'Circle', formulas: ['\\(A=\\pi r^2\\)', '\\(C=2\\pi r\\)'] },
  { id: 'rectangle', title: 'Rectangle', formulas: ['\\(A=lw\\)'] },
  { id: 'triangle', title: 'Triangle', formulas: ['\\(A=\\frac{1}{2}bh\\)'] },
  { id: 'right-triangle', title: 'Right triangle', formulas: ['\\(c^2=a^2+b^2\\)'] },
  { id: 'triangle-30', title: '30-60-90', formulas: ['\\(x,\\ x\\sqrt{3},\\ 2x\\)'] },
  { id: 'triangle-45', title: '45-45-90', formulas: ['\\(s,\\ s,\\ s\\sqrt{2}\\)'] },
  { id: 'prism', title: 'Rectangular prism', formulas: ['\\(V=lwh\\)'] },
  { id: 'cylinder', title: 'Cylinder', formulas: ['\\(V=\\pi r^2h\\)'] },
  { id: 'sphere', title: 'Sphere', formulas: ['\\(V=\\frac{4}{3}\\pi r^3\\)'] },
  { id: 'cone', title: 'Cone', formulas: ['\\(V=\\frac{1}{3}\\pi r^2h\\)'] },
  { id: 'pyramid', title: 'Rectangular pyramid', formulas: ['\\(V=\\frac{1}{3}lwh\\)'] }
];

function DiagramLabel({ x, y, children }) {
  return <text x={x} y={y} className="sat-reference-label">{children}</text>;
}

function ReferenceDiagram({ type }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

  if (type === 'circle') return <svg viewBox="0 0 150 92" aria-hidden="true"><circle {...common} cx="72" cy="44" r="31" /><circle cx="72" cy="44" r="3" fill="currentColor" /><line {...common} x1="72" y1="44" x2="103" y2="44" /><DiagramLabel x="87" y="38">r</DiagramLabel></svg>;
  if (type === 'rectangle') return <svg viewBox="0 0 150 92" aria-hidden="true"><rect {...common} x="30" y="23" width="90" height="46" /><DiagramLabel x="72" y="84">l</DiagramLabel><DiagramLabel x="126" y="49">w</DiagramLabel></svg>;
  if (type === 'triangle') return <svg viewBox="0 0 150 92" aria-hidden="true"><path {...common} d="M24 72 L126 72 L76 15 Z" /><path {...common} strokeDasharray="5 4" d="M76 15 L76 72" /><path {...common} d="M76 64 L84 64 L84 72" /><DiagramLabel x="74" y="87">b</DiagramLabel><DiagramLabel x="82" y="45">h</DiagramLabel></svg>;
  if (type === 'right-triangle') return <svg viewBox="0 0 150 92" aria-hidden="true"><path {...common} d="M31 72 L31 20 L122 72 Z" /><path {...common} d="M31 62 L41 62 L41 72" /><DiagramLabel x="19" y="49">b</DiagramLabel><DiagramLabel x="73" y="86">a</DiagramLabel><DiagramLabel x="79" y="42">c</DiagramLabel></svg>;
  if (type === 'triangle-30') return <svg viewBox="0 0 150 92" aria-hidden="true"><path {...common} d="M18 72 L126 72 L126 18 Z" /><path {...common} d="M116 72 L116 62 L126 62" /><DiagramLabel x="23" y="68">30 deg</DiagramLabel><DiagramLabel x="103" y="30">60 deg</DiagramLabel><DiagramLabel x="60" y="86">x sqrt(3)</DiagramLabel><DiagramLabel x="130" y="48">x</DiagramLabel><DiagramLabel x="61" y="38">2x</DiagramLabel></svg>;
  if (type === 'triangle-45') return <svg viewBox="0 0 150 92" aria-hidden="true"><path {...common} d="M32 72 L32 15 L115 72 Z" /><path {...common} d="M32 62 L42 62 L42 72" /><DiagramLabel x="39" y="28">45 deg</DiagramLabel><DiagramLabel x="87" y="68">45 deg</DiagramLabel><DiagramLabel x="19" y="45">s</DiagramLabel><DiagramLabel x="70" y="86">s</DiagramLabel><DiagramLabel x="68" y="38">s sqrt(2)</DiagramLabel></svg>;
  if (type === 'prism') return <svg viewBox="0 0 150 92" aria-hidden="true"><path {...common} d="M27 35 L91 35 L91 74 L27 74 Z M27 35 L48 18 L113 18 L91 35 M91 74 L113 56 L113 18" /><DiagramLabel x="57" y="87">l</DiagramLabel><DiagramLabel x="105" y="72">w</DiagramLabel><DiagramLabel x="118" y="40">h</DiagramLabel></svg>;
  if (type === 'cylinder') return <svg viewBox="0 0 150 92" aria-hidden="true"><ellipse {...common} cx="72" cy="23" rx="36" ry="12" /><path {...common} d="M36 23 V67 M108 23 V67" /><path {...common} d="M36 67 C36 83 108 83 108 67" /><path {...common} strokeDasharray="5 4" d="M36 67 C36 52 108 52 108 67" /><circle cx="72" cy="23" r="2.5" fill="currentColor" /><line {...common} x1="72" y1="23" x2="106" y2="23" /><DiagramLabel x="88" y="18">r</DiagramLabel><DiagramLabel x="114" y="50">h</DiagramLabel></svg>;
  if (type === 'sphere') return <svg viewBox="0 0 150 92" aria-hidden="true"><circle {...common} cx="72" cy="45" r="34" /><ellipse {...common} strokeDasharray="5 4" cx="72" cy="45" rx="34" ry="11" /><circle cx="72" cy="45" r="2.5" fill="currentColor" /><line {...common} x1="72" y1="45" x2="105" y2="45" /><DiagramLabel x="88" y="39">r</DiagramLabel></svg>;
  if (type === 'cone') return <svg viewBox="0 0 150 92" aria-hidden="true"><path {...common} d="M72 10 L31 70 M72 10 L113 70" /><ellipse {...common} cx="72" cy="70" rx="41" ry="12" /><line {...common} strokeDasharray="5 4" x1="72" y1="10" x2="72" y2="70" /><line {...common} x1="72" y1="70" x2="111" y2="70" /><DiagramLabel x="77" y="42">h</DiagramLabel><DiagramLabel x="91" y="65">r</DiagramLabel></svg>;
  return <svg viewBox="0 0 150 92" aria-hidden="true"><path {...common} d="M72 9 L24 65 L73 82 L126 62 Z M72 9 L73 82 M24 65 L126 62" /><line {...common} strokeDasharray="5 4" x1="72" y1="9" x2="72" y2="64" /><DiagramLabel x="77" y="40">h</DiagramLabel><DiagramLabel x="48" y="84">l</DiagramLabel><DiagramLabel x="105" y="78">w</DiagramLabel></svg>;
}

export default function SatMathReferenceSheet() {
  return (
    <div className="sat-reference-sheet">
      <div className="sat-reference-heading"><span>REFERENCE</span><p>These formulas are available throughout every MonoPrep SAT Math module.</p></div>
      <div className="formula-reference-grid">
        {REFERENCE_ITEMS.map((item) => (
          <article key={item.id}>
            <ReferenceDiagram type={item.id} />
            <strong>{item.title}</strong>
            {item.formulas.map((formula) => <MathJaxContent key={formula}>{formula}</MathJaxContent>)}
          </article>
        ))}
      </div>
      <div className="formula-footnote">
        <p>The number of degrees of arc in a circle is 360.</p>
        <MathJaxContent>The number of radians of arc in a circle is \(2\pi\).</MathJaxContent>
        <p>The sum of the measures in degrees of the angles of a triangle is 180.</p>
      </div>
    </div>
  );
}
