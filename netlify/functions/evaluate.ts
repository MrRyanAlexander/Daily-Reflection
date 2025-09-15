// netlify/functions/evaluate.ts
import type { Handler } from "@netlify/functions";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handler: Handler = async (event) => {
  try {
    const { text, locale, goals, level } = JSON.parse(event.body ?? "{}");

    // Guard
    if (!text || typeof text !== "string") {
      return json(400, { error: "Missing 'text'." });
    }

    // Ask the model to return a structured JSON we can render
    const response = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "You are a patient writing coach for ESL/B1 learners. Evaluate short daily reflections. Return JSON with 'issues' (typed spans), 'topTips' (succinct), and one 'example' rewrite with parts marked bold where changed. Keep tone positive. Prioritize clarity over grammar jargon.",
        },
        {
          role: "user",
          content: JSON.stringify({
            text,
            locale: locale ?? "en",
            goals: goals ?? ["tell day", "feelings", "next action"],
            target_level: level ?? "simple_ENGLISH_B1",
          }),
        },
      ],
      // Ask for JSON guarantees
      response_format: { type: "json_schema",
        json_schema: {
          name: "EvalResult",
          schema: {
            type: "object",
            required: ["issues", "topTips"],
            properties: {
              issues: {
                type: "array",
                items: {
                  type: "object",
                  required: ["type", "start", "end"],
                  properties: {
                    type: { type: "string", enum: ["spell", "grammar", "clarity", "structure"] },
                    start: { type: "integer" },
                    end: { type: "integer" },
                    tip: { type: "string" },
                  },
                },
              },
              topTips: {
                type: "array",
                items: {
                  type: "object",
                  required: ["title", "why", "examples"],
                  properties: {
                    title: { type: "string" },
                    why: { type: "string" },
                    examples: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["before", "after"],
                        properties: {
                          before: { type: "string" },
                          after: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
              example: {
                type: "object",
                required: ["before", "afterParts"],
                properties: {
                  before: { type: "string" },
                  afterParts: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["text"],
                      properties: {
                        text: { type: "string" },
                        bold: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const jsonText = response.output?.[0]?.content?.[0]?.text ?? "{}";
    const payload = JSON.parse(jsonText);
    return json(200, payload);
  } catch (err: unknown) {
    console.error(err);
    return json(500, { error: "Evaluation failed." });
  }
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}