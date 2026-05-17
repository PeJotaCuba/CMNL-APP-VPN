import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Lee firebase config si existe
  let firebaseConfig: any = null;
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
  } catch (e) {
    console.log("No firebase config found");
  }

  // Endpoints Proxy para conectarse a Firebase a través del backend (anti-bloqueos/VPN)
  if (firebaseConfig) {
    const { projectId, firestoreDatabaseId } = firebaseConfig;
    const dbId = firestoreDatabaseId || '(default)';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents`;

    app.get('/api/agendas', async (req, res) => {
      try {
        const resp = await fetch(`${baseUrl}:runQuery`, {
          method: 'POST',
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'generated_agendas' }],
              orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
              limit: 50
            }
          })
        });
        const data = await resp.json();
        
        if (data[0] && data[0].error) {
           return res.status(500).json({ error: data[0].error.message });
        }
        
        // runQuery returns an array of { document, readTime }
        if (!Array.isArray(data) || (!data[0]?.document && Object.keys(data[0] || {}).length <= 1)) {
           return res.json([]);
        }
        
        const docs = data.map((d: any) => {
          if (!d.document) return null;
          const fields = d.document.fields || {};
          return {
            id: d.document.name.split('/').pop(),
            filename: fields.filename?.stringValue,
            createdAt: fields.createdAt?.timestampValue || fields.createdAt?.stringValue,
            month: fields.month?.stringValue,
            weekLabel: fields.weekLabel?.stringValue,
            hasBinary: fields.hasBinary?.booleanValue,
            fileData: fields.fileData?.bytesValue,
            sharedBy: fields.sharedBy?.stringValue,
            authorId: fields.authorId?.stringValue
          };
        }).filter(Boolean);
        res.json(docs);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post('/api/agendas', async (req, res) => {
      const newId = req.body.id || Date.now().toString();
      const postUrl = `${baseUrl}/generated_agendas?documentId=${newId}`;
      const fields: any = {
        filename: { stringValue: req.body.filename || '' },
        month: { stringValue: req.body.month || '' },
        weekLabel: { stringValue: req.body.weekLabel || '' },
        sharedBy: { stringValue: req.body.sharedBy || 'Proxy' },
        authorId: { stringValue: req.body.authorId || 'Anonymous' },
        createdAt: { timestampValue: new Date().toISOString() },
        hasBinary: { booleanValue: req.body.hasBinary || false },
      };
      if (req.body.fileData) {
        fields.fileData = { bytesValue: req.body.fileData };
      }

      try {
        const resp = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        });
        const data = await resp.json();
        if (!resp.ok) {
           console.error("Firestore Upload Error from Proxy:", data);
           require('fs').appendFileSync('proxy.log', JSON.stringify({err: data}) + '\\n');
           return res.status(resp.status).json(data);
        }
        res.json(data);
      } catch (e: any) {
        console.error("Server fetch error:", e.message);
        require('fs').appendFileSync('proxy.log', JSON.stringify({err: e.message}) + '\\n');
        res.status(500).json({ error: e.message });
      }
    });

    app.delete('/api/agendas/:id', async (req, res) => {
      try {
        const resp = await fetch(`${baseUrl}/generated_agendas/${req.params.id}`, { method: 'DELETE' });
        const data = await resp.json();
        res.json(data);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete('/api/agendas', async (req, res) => {
      try {
        const listResp = await fetch(`${baseUrl}:runQuery`, {
          method: 'POST',
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'generated_agendas' }]
            }
          })
        });
        const data = await listResp.json();
        
        if (data[0] && data[0].error) {
           return res.status(500).json({ error: data[0].error.message });
        }
        
        for (const d of data) {
          if (d.document?.name) {
            await fetch(`https://firestore.googleapis.com/v1/${d.document.name}`, { method: 'DELETE' });
          }
        }
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });
  }

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
