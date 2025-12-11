// api/chat/index.js

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
    return;
  }

  const body = req.body || {};
  const userMessage = body.message || "";

  if (!userMessage) {
    context.res = {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: { error: "No message provided." }
    };
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are the Rural Cyber Guard assistant. You help farmers, rural homes " +
              "and countryside businesses understand cybersecurity in clear, simple language. " +
              "Focus on practical, non-alarmist advice. If the user asks about services, " +
              "explain Rural Cyber Guard’s offerings (Smart Farm Secure, Protect+ Monitoring, " +
              "Cyber Essentials support) and suggest they contact Matthew on 07967 656987."
          },
          { role: "user", content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      context.log.error("OpenAI API error:", response.status, text);
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: { reply }
    };
  } catch (err) {
    context.log.error("Chat error:", err.message || err);
    context.res = {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: { error: "Error calling AI service." }
    };
  }
};


