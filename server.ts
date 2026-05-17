import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post('/api/news', async (req, res) => {
    const { url } = req.body;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const html = await response.text();
      const $ = cheerio.load(html);
      const headlines: any[] = [];

      // Selectores personalizados por dominio
      let elements;
      if (url.includes('cubadebate.cu')) {
        elements = $('.title a, .note_title a, article h2 a');
      } else {
        elements = $('article h2 a, .main-content h2 a, h2 a');
      }

      elements.each((i, el) => {
        if (headlines.length >= 5) return false;
        const title = $(el).text().trim();
        if (!title) return;
        let link = $(el).attr('href');
        if (link && link.startsWith('/')) {
          try {
            const domain = new URL(url).origin;
            link = domain + link;
          } catch (e) {
            // Ignore invalid URLs
          }
        }
        // Resumen: buscar párrafo cercano
        let summary = '';
        const parent = $(el).closest('article, .news-item, .item');
        if (parent.length) {
          summary = parent.find('p').first().text().trim();
        }
        headlines.push({ id: i, title, summary, link });
      });

      res.json(headlines);
    } catch (error: any) {
      console.error(`Error scraping ${url}:`, error.message);
      res.status(200).json([{ title: 'Conexión interrumpida', link: url }]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
