export default function Home() {
  return (
    <main>
      <h1>Spacecraft Thermal Analysis API</h1>
      <p>Backend API server. Frontend coming soon.</p>
      <h2>API Endpoints</h2>
      <ul>
        <li><code>GET /api/projects</code> — List projects</li>
        <li><code>POST /api/projects</code> — Create project</li>
        <li><code>GET /api/materials</code> — List materials</li>
        <li><code>POST /api/orbital-env</code> — Calculate orbital environment</li>
        <li><code>POST /api/projects/[id]/models/[mid]/simulate</code> — Run simulation</li>
      </ul>
    </main>
  );
}
