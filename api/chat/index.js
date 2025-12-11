// api/chat/index.js

module.exports = async function (context, req) {
  // CORS preflight support
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
    return;
  }

  const method = req.method || "GET";
  let userMessage = "";

  if (method === "POST") {
    const body = req.body || {};
    userMessage = body.message || "";
  } else {
    userMessage = "(GET request – no message body)";
  }

  // If no message given, just say hello
  if (!userMessage) {
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: {
        reply:
          "Hi, this is the Rural Cyber Guard assistant. Ask me a question about farm or rural cybersecurity."
      }
    };
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key configured, DO NOT crash – respond gracefully
    if (!apiKey) {
      context.log.warn("OPENAI_API_KEY not configured. Returning static reply.");
      context.res = {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: {
          reply:
            "Our AI assistant isn’t fully configured yet, but we’d still love to help. " +
            "Please contact Matthew directly on 07967 656987 or email support@ruralcyberguard.co.uk."
        }
      };
      return;
    }

    // Call OpenAI's chat API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // Use a safe, widely-available model name
        model: "gpt-4o-mini",
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

    const text = await response.text();

    if (!response.ok) {
      context.log.error("OpenAI API error:", response.status, text);
      // Do NOT return 500 – keep the UI happy
      context.res = {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: {
          reply:
            "I’m having trouble talking to the AI service right now. " +
            "Please try again later or contact Matthew on 07967 656987."
        }
      };
      return;
    }

    const data = JSON.parse(text);
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
    context.log.error("Chat function error:", err.message || err);
    // Still return 200 so the front-end never sees a 500
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: {
        reply:
          "Something went wrong while processing your request. " +
          "For urgent help, please contact Matthew on 07967 656987."
      }
    };
  }
};
