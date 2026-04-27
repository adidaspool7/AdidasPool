/**
 * AdidasJobScraperService \u2014 unit tests for fetchJobDescription.
 *
 * We mock global.fetch with vi.fn() and feed the scraper hand-curated
 * HTML fixtures that mirror the shapes we have actually seen in the wild:
 *
 *   - OPEN posting in English with a real .jobdescription block
 *   - CLOSED posting that renders the "application period closed" banner
 *   - UNAVAILABLE: page reachable but no JD body and no closed banner
 *   - UNAVAILABLE: chrome-only body (cookies / nav) that must NOT be fed to the LLM
 *   - ERROR: HTTP 500
 *   - ERROR: network failure (fetch throws)
 *   - OPEN: Portuguese sectionless JD (Specialist Store Development style)
 *   - OPEN: Spanish JD with explicit "B2 ingl\u00e9s" requirement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AdidasJobScraperService } from "@server/infrastructure/scraping/adidas-job-scraper.service";

const URL = "https://jobs.adidas-group.com/job/Sao-Paulo-Specialist/1386654833/";

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function wrap(content: string): string {
  // Realistic-ish wrapper so length checks pass and selectors find their parents
  return `<!doctype html><html><head><title>adidas Careers</title></head>
<body>
  <header><nav>Skip to main content</nav></header>
  ${content}
  <footer>\u00a9 adidas</footer>
</body></html>`;
}

describe("AdidasJobScraperService.fetchJobDescription", () => {
  let scraper: AdidasJobScraperService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scraper = new AdidasJobScraperService();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns OPEN with body when .jobdescription contains real prose", async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(
        wrap(
          `<div class="jobdescription">
            <h2>Purpose</h2>
            <p>Lead the in-store retail experience for the flagship location.
            Drive sales targets, coach the team, and ensure brand standards.</p>
            <h2>Requirements</h2>
            <p>3+ years of retail management experience required.
            Fluent English. Strong leadership and communication skills.</p>
          </div>`
        )
      )
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("OPEN");
    expect(result.body).toBeTruthy();
    expect(result.body!).toMatch(/retail/i);
    expect(result.body!).toMatch(/Requirements/i);
  });

  it("returns CLOSED when the application-period-closed banner is present", async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(
        wrap(
          `<div class="jobdescription">
            <p>THE APPLICATION PERIOD FOR THIS ROLE HAS BEEN CLOSED.
            ALL APPLICATION STATUSES WILL BE COMMUNICATED TO APPLICANTS DIRECTLY.</p>
          </div>`
        )
      )
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("CLOSED");
    expect(result.body).toBeNull();
  });

  it("detects CLOSED case-insensitively even when banner sits outside .jobdescription", async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(
        wrap(
          `<main>
            <p>The application period for this role has been closed.</p>
            <div class="jobdescription"></div>
          </main>`
        )
      )
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("CLOSED");
  });

  it("returns UNAVAILABLE when no selector matches and no banner is present", async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(wrap(`<main><p>Loading\u2026</p></main>`))
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.body).toBeNull();
  });

  it("returns UNAVAILABLE for chrome-only body (cookie banners + search widget)", async () => {
    // This is the critical regression case: the OLD scraper fell back to
    // <body> here and returned ~7KB of cookie/nav text, which the LLM then
    // hallucinated requirements from. The NEW scraper must reject it.
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(
        wrap(
          `<div id="content-wrapper">
            <div>Search by Keyword</div>
            <div>Search by Location</div>
            <div>Cookies Settings | Accept All Cookies | Privacy Policy</div>
            <script>j2w.init({ pageId: 'foo' });</script>
            <div><![CDATA[ widget config ]]></div>
          </div>`
        )
      )
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.body).toBeNull();
  });

  it("returns UNAVAILABLE when the JD region has prose but too few sentences", async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(
        wrap(
          `<div class="jobdescription">${"A".repeat(220)} no sentences here at all</div>`
        )
      )
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("UNAVAILABLE");
  });

  it("returns ERROR on HTTP 500", async () => {
    fetchSpy.mockResolvedValueOnce(htmlResponse("server boom", 500));
    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("ERROR");
    expect(result.body).toBeNull();
  });

  it("returns ERROR when fetch itself throws", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNRESET"));
    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("ERROR");
    expect(result.body).toBeNull();
  });

  it("returns OPEN for a Portuguese sectionless JD (Specialist Store Development style)", async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(
        wrap(
          `<div class="jobdescription">
            <p>Como Specialist Store Development, voc\u00ea ser\u00e1 respons\u00e1vel por
            apoiar o desenvolvimento e a expans\u00e3o da rede de lojas no Brasil.
            Voc\u00ea ir\u00e1 colaborar com equipes regionais e parceiros locais.</p>
            <p>Suas atividades incluem an\u00e1lise de mercado, sele\u00e7\u00e3o de pontos
            comerciais, acompanhamento de obras e relacionamento com parceiros.
            Voc\u00ea reportar\u00e1 ao Senior Manager Store Development.</p>
          </div>`
        )
      )
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("OPEN");
    expect(result.body).toMatch(/Specialist Store Development/);
    expect(result.body).toMatch(/Brasil/);
  });

  it("returns OPEN for a Spanish JD with explicit B2 English requirement", async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse(
        wrap(
          `<div id="job-description">
            <h3>Responsabilidades</h3>
            <p>Gestionar el inventario de la tienda y atender al cliente
            con est\u00e1ndares de marca. Coordinar al equipo de ventas en turnos.</p>
            <h3>Requisitos</h3>
            <ul><li>Experiencia previa en retail.</li>
            <li>Nivel B2 ingl\u00e9s imprescindible.</li>
            <li>Disponibilidad para fines de semana.</li></ul>
          </div>`
        )
      )
    );

    const result = await scraper.fetchJobDescription(URL);
    expect(result.status).toBe("OPEN");
    expect(result.body).toMatch(/Requisitos/);
    expect(result.body).toMatch(/B2 ingl\u00e9s/);
  });
});
