import express from "express";
import { MODEL, ai } from "../gemini.js";

const router = express.Router();

const PROMPT = `You are a trivia question writer.
Given a topic, write ONE fun multiple-choice question about it.
Reply as JSON with this exact shape:
{ "question": string, "options": [string, string, string, string], "answer": string }
The "answer" must be exactly one of the four options. No preamble, no markdown.
`;

router.post('/', async (req, res) => {
  const topic = req.body?.topic;
  if (typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Enter a topic.' });
  }

  const schema = {
    type: 'object',
    properties: {
      question: { type: 'string' },
      options: {
        type: 'array',
        items: { type: 'string' },
        minItems: 4,
        maxItems: 4,
      },
      answer: { type: 'string' },
    },
    required: ['question', 'options', 'answer'],
  };

  let failure;

  for (const model of [...new Set(['gemini-3.5-flash-lite', MODEL])]) {
    try {
      const result = await ai.interactions.create(
        {
          model,
          input: `Topic: ${topic}`,
          system_instruction: PROMPT,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema,
          },
        },
        { timeout: 20000, maxRetries: 2 }
      );

      const quiz = JSON.parse(result.output_text);

      if (
        typeof quiz.question !== 'string' ||
        !quiz.question.trim() ||
        !Array.isArray(quiz.options) ||
        quiz.options.length !== 4 ||
        !quiz.options.every((option) => typeof option === 'string' && option.trim()) ||
        !quiz.options.includes(quiz.answer)
      ) {
        throw new Error('Gemini returned an invalid question.');
      }

      return res.json(quiz);
    } catch (error) {
      console.error(error);
      failure = error;
      const status = Number(error.status ?? error.statusCode);
      if (status && ![408, 429, 500, 502, 503, 504].includes(status)) break;
    }
  }

  return res.status(502).json({
    error: failure?.message || 'Question generation failed.',
  });
});

export default router;
