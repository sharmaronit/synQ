import { NextRequest, NextResponse } from "next/server";
import type { DataStory, DatasetSchema, ColumnStatSummary, KPIResult, InsightPlan } from "@/types";

interface StoryRequest {
  schema: DatasetSchema;
  dataStats: ColumnStatSummary[];
  datasetName: string;
  kpis: KPIResult[];
  insights: InsightPlan[];
}

function buildStoryPrompt(body: StoryRequest): string {
  const { schema, dataStats, datasetName, kpis, insights } = body;

  const colSummary = dataStats.map((c) => {
    if (c.type === "number") return `  - ${c.name} (number): min=${c.min}, max=${c.max}, mean=${c.mean}, sum=${c.sum}`;
    if (c.type === "string" && c.topValues) return `  - ${c.name} (category): top values — ${c.topValues.slice(0, 5).map((v) => `${v.value} (${v.pct}%)`).join(", ")}`;
    if (c.type === "date" && c.dateRange) return `  - ${c.name} (date): ${c.dateRange.min} → ${c.dateRange.max}`;
    return `  - ${c.name} (${c.type})`;
  }).join("\n");

  const kpiSummary = kpis.map((k) => `  - ${k.label}: ${k.value}`).join("\n");
  const insightSummary = insights.map((i) => `  - [${i.type}] ${i.text}`).join("\n");

  return `You are a senior data analyst writing an executive data story for stakeholders.

Dataset: "${datasetName}"
Rows: ${schema.rowCount.toLocaleString()} | Columns: ${schema.columns.length}

Column Statistics:
${colSummary}

Key Metrics:
${kpiSummary || "  (none computed yet)"}

AI Insights:
${insightSummary || "  (none)"}

Write a concise executive data story. Return ONLY valid JSON with this exact structure:
{
  "title": "short headline (max 10 words)",
  "executive_summary": "2-3 sentence overview of the dataset and its key story",
  "key_findings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "anomalies": ["anomaly or risk 1", "anomaly or risk 2"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "conclusion": "1-2 sentence closing that ties findings to business value"
}

Be specific, use actual numbers from the statistics above, and keep each item under 25 words.`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: StoryRequest = await request.json();

    if (!body.schema || !body.datasetName) {
      return NextResponse.json({ message: "schema and datasetName are required" }, { status: 400 });
    }

    const prompt = buildStoryPrompt(body);
    const githubToken = process.env.GITHUB_TOKEN;
    const geminiKey   = process.env.GEMINI_API_KEY;

    // ── GitHub Models (GPT-4o-mini) ────────────────────────────────────────
    if (githubToken) {
      const aiResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${githubToken}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        return NextResponse.json({ message: `GitHub Models error: ${err.slice(0, 200)}` }, { status: 502 });
      }

      const aiData = await aiResponse.json();
      const story: DataStory = JSON.parse(aiData.choices?.[0]?.message?.content ?? "{}");
      return NextResponse.json({ story });
    }

    // ── Gemini ─────────────────────────────────────────────────────────────
    if (geminiKey) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.3, topP: 0.95, maxOutputTokens: 1024, responseMimeType: "application/json" },
      });

      const result = await model.generateContent(prompt);
      const story: DataStory = JSON.parse(result.response.text());
      return NextResponse.json({ story });
    }

    // ── Fallback (no API key) — generate from stats ────────────────────────
    const numCols = body.dataStats.filter((c) => c.type === "number");
    const catCols = body.dataStats.filter((c) => c.type === "string" && c.topValues);
    const dateCols = body.dataStats.filter((c) => c.type === "date" && c.dateRange);

    const topFinding = numCols[0]
      ? `${numCols[0].name} ranges from ${numCols[0].min} to ${numCols[0].max} with a mean of ${numCols[0].mean}`
      : "Dataset loaded successfully";
    const topCat = catCols[0]?.topValues?.[0]
      ? `The most common ${catCols[0].name} is "${catCols[0].topValues[0].value}" at ${catCols[0].topValues[0].pct}%`
      : null;
    const dateRange = dateCols[0]?.dateRange
      ? `Data spans from ${dateCols[0].dateRange.min} to ${dateCols[0].dateRange.max}`
      : null;

    const story: DataStory = {
      title: `${body.datasetName} — Data Overview`,
      executive_summary: `This dataset contains ${body.schema.rowCount.toLocaleString()} rows across ${body.schema.columns.length} columns. ${topFinding}. ${body.kpis.length > 0 ? `Key metrics: ${body.kpis.slice(0, 2).map((k) => `${k.label} = ${k.value}`).join(", ")}.` : ""}`,
      key_findings: [
        topFinding,
        ...(topCat ? [topCat] : []),
        ...(dateRange ? [dateRange] : []),
        ...body.insights.slice(0, 2).map((i) => i.text),
        `Dataset has ${body.schema.columns.length} columns: ${body.schema.columns.map((c) => c.name).slice(0, 4).join(", ")}${body.schema.columns.length > 4 ? "..." : ""}`,
      ].slice(0, 4),
      anomalies: body.insights.filter((i) => i.type === "anomaly").map((i) => i.text).slice(0, 2),
      recommendations: [
        "Filter data by key categories to identify subgroup patterns",
        "Analyze trends over time if date columns are available",
        "Compare top-performing segments against the average",
      ],
      conclusion: `With ${body.schema.rowCount.toLocaleString()} records and ${body.schema.columns.length} dimensions, this dataset provides a solid foundation for decision-making. Upload an API key for AI-powered deeper insights.`,
    };

    return NextResponse.json({ story });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: `Story generation failed: ${message}` }, { status: 502 });
  }
}
