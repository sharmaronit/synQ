import { NextRequest, NextResponse } from "next/server";
import type { QueryRequest, QueryResponse, AnalyticsPlan, SQLQueryPlan } from "@/types";
import { validatePlanAgainstSchema, autoCorrectPlan } from "@/lib/schema-validator";
import { buildSQLPrompt } from "@/lib/sql-prompt-builder";
import { generateMockPlan } from "@/lib/mock-gemini";

function normalizeSQLPlanForQuery(query: string, sqlPlan: SQLQueryPlan): SQLQueryPlan {
  const normalizedQuery = query.toLowerCase();
  const wantsLowest = /\b(lowest|least|minimum|min)\b/.test(normalizedQuery);
  const wantsHighest = /\b(highest|most|maximum|max)\b/.test(normalizedQuery);
  const asksForSingleWinner = /\b(which|what)\b/.test(normalizedQuery) && !/\b(top|bottom)\s+\d+\b/.test(normalizedQuery);
  const hasGroupBy = /\bGROUP\s+BY\b/i.test(sqlPlan.sql);
  const orderMatch = sqlPlan.sql.match(/\bORDER\s+BY\s+([\w`\[\]\s]+?)(?:\s+(ASC|DESC))?(?=\s+LIMIT\b|\s*$)/i);

  if ((!wantsLowest && !wantsHighest) || !asksForSingleWinner || !hasGroupBy || !orderMatch) {
    return sqlPlan;
  }

  const desiredDirection = wantsLowest ? "ASC" : "DESC";
  let sql = sqlPlan.sql.replace(/\bORDER\s+BY\s+([\w`\[\]\s]+?)(?:\s+(ASC|DESC))?(?=\s+LIMIT\b|\s*$)/i, (_match, expr) => {
    return `ORDER BY ${String(expr).trim()} ${desiredDirection}`;
  });

  if (/\bLIMIT\s+\d+\b/i.test(sql)) {
    sql = sql.replace(/\bLIMIT\s+\d+\b/i, "LIMIT 1");
  } else {
    sql = `${sql} LIMIT 1`;
  }

  return {
    ...sqlPlan,
    sql,
  };
}

// Build a minimal AnalyticsPlan stub from an SQLQueryPlan.
// Carries title / description / insights for the UI; kpis/charts derived client-side.
function buildStubPlan(sqlPlan: SQLQueryPlan): AnalyticsPlan {
  return {
    title: sqlPlan.title,
    description: sqlPlan.description,
    answer: sqlPlan.description,
    kpis: [],
    charts: [],
    insights: sqlPlan.insights.map((i) => ({ text: i.text, type: i.type })),
    filters: [],
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: QueryRequest = await request.json();
    const { query, schema, dataStats } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ message: "Query is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!schema || schema.columns.length === 0) {
      return NextResponse.json({ message: "Schema is required", code: "SCHEMA_ERROR" }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const geminiKey   = process.env.GEMINI_API_KEY;

    // -------------------------------------------------------------------------
    // BRANCH A: GitHub Models → SQL mode
    // -------------------------------------------------------------------------
    if (githubToken) {
      const prompt = buildSQLPrompt(query, schema, dataStats);

      const aiResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${githubToken}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        return NextResponse.json(
          { message: `GitHub Models error: ${aiResponse.status} ${err.slice(0, 200)}`, code: "GITHUB_MODELS_ERROR" },
          { status: 502 }
        );
      }

      const aiData = await aiResponse.json();
      const responseText: string = aiData.choices?.[0]?.message?.content ?? "";

      let sqlPlan: SQLQueryPlan;
      try {
        sqlPlan = normalizeSQLPlanForQuery(query, JSON.parse(responseText) as SQLQueryPlan);
      } catch {
        return NextResponse.json(
          { message: "GitHub Models returned invalid JSON", code: "PARSE_ERROR", details: responseText.slice(0, 500) },
          { status: 502 }
        );
      }

      const plan = buildStubPlan(sqlPlan);
      const response: QueryResponse = { plan, sqlPlan, validationErrors: [] };
      return NextResponse.json(response);
    }

    // -------------------------------------------------------------------------
    // BRANCH B: Gemini → SQL mode
    // -------------------------------------------------------------------------
    if (geminiKey) {
      const prompt = buildSQLPrompt(query, schema, dataStats);

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.1, topP: 0.95, maxOutputTokens: 2048, responseMimeType: "application/json" },
      });

      const result      = await model.generateContent(prompt);
      const responseText = result.response.text();

      let sqlPlan: SQLQueryPlan;
      try {
        sqlPlan = normalizeSQLPlanForQuery(query, JSON.parse(responseText) as SQLQueryPlan);
      } catch {
        return NextResponse.json(
          { message: "Gemini returned invalid JSON", code: "PARSE_ERROR", details: responseText.slice(0, 500) },
          { status: 502 }
        );
      }

      const plan = buildStubPlan(sqlPlan);
      const response: QueryResponse = { plan, sqlPlan, validationErrors: [] };
      return NextResponse.json(response);
    }

    // -------------------------------------------------------------------------
    // BRANCH C: Mock mode (no API key) — unchanged AnalyticsPlan flow
    // -------------------------------------------------------------------------
    let plan: AnalyticsPlan = generateMockPlan(query, schema);
    plan = autoCorrectPlan(plan, schema);
    const validationErrors = validatePlanAgainstSchema(plan, schema);

    if (!plan.kpis)    plan.kpis    = [];
    if (!plan.charts)  plan.charts  = [];
    if (!plan.insights) plan.insights = [];

    // sqlPlan intentionally absent — triggers mock/executePlan path client-side
    const response: QueryResponse = { plan, validationErrors };
    return NextResponse.json(response);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: `Query processing error: ${message}`, code: "GEMINI_ERROR" }, { status: 502 });
  }
}
