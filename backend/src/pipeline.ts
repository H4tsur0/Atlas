import { Env } from './index';

// Interface matching our D1 Database Article structure
interface RawArticle {
  title: string;
  url: string;
  source: string;
  content: string;
  publishedAt: string;
}

export async function runNewsPipeline(env: Env): Promise<void> {
  console.log("Starting morning pipeline processing sync...");

  try {
    // Step 1: Fetch Raw Data from your News Sources/APIs
    const rawArticles = await fetchIncomingNews(env);
    console.log(`Ingested ${rawArticles.length} raw articles from external sources.`);

    for (const article of rawArticles) {
      // Step 2: De-duplication Check
      // Check if the URL has already been processed and saved to D1
      const exists = await env.DB.prepare(
        "SELECT id FROM articles WHERE url = ?"
      ).bind(article.url).first();

      if (exists) {
        console.log(`Skipping duplicate URL: ${article.url}`);
        continue; // Drop it and move to the next one
      }

      // Step 3: Run AI Summarization and Trust Analysis via OpenAI
      console.log(`Processing intelligence envelope for: ${article.title}`);
      const aiAnalysis = await analyzeArticleWithAI(article, env);

      // Step 4: Write Clean Data to Cloudflare D1
      const articleId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO articles (id, title, url, source_name, ai_summary, published_at) 
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        articleId,
        article.title,
        article.url,
        article.source,
        aiAnalysis.summary,
        article.publishedAt
      ).run();

      console.log(`Successfully stored processed article: ${articleId}`);
    }

    console.log("Morning news pipeline cycle completed smoothly.");
  } catch (error) {
    console.error(`[PIPELINE CRITICAL FAILURE]: ${error}`);
  }
}

// Helper to pull data from external providers
async function fetchIncomingNews(env: Env): Promise<RawArticle[]> {
  // In a production setup, you would fetch real data from NewsAPI or RSS feeds here.
  // Returning mock data for demonstration:
  return [
    {
      title: "Global Supply Chains Shift Toward Edge Computing In Automated Factories",
      url: "https://reuters-simulation.com/industrial-automation-2026",
      source: "Reuters",
      content: "Full text of the article highlighting PLCs, industrial network security, and edge systems...",
      publishedAt: new Date().toISOString()
    }
  ];
}

// Interacting securely with OpenAI to build the core summary feature
async function analyzeArticleWithAI(article: RawArticle, env: Env) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Cost-effective, high-speed model for pipeline data
      messages: [
        {
          role: "system",
          content: "You are an expert data curation engine for Project Atlas. Summarize the following news text into a concise, objective 3-sentence TL;DR briefing."
        },
        {
          role: "user",
          content: `Source: ${article.source}\nTitle: ${article.title}\nText: ${article.content}`
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API communication failure: ${response.statusText}`);
  }

  const result = await response.json() as any;
  const summaryText = result.choices[0].message.content.trim();

  return {
    summary: summaryText
  };
}