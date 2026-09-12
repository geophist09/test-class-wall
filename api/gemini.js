// ===================================================
// Gemini에게 물어보는 서버 코드가 들어올 자리 (아직 비어 있습니다)
//
// 왜 서버가 필요한가요?
//   API 키를 브라우저 코드(app.js)에 적으면 누구나 볼 수 있습니다.
//   그래서 키는 서버에만 두고, 브라우저는 이 주소로 부탁만 합니다.
//
// 왜 Firebase Functions가 아니라 여기인가요?
//   Firebase Functions는 유료 요금제(Blaze)라야 씁니다.
//   이 프로젝트는 무료 요금제(Spark)로 진행하므로,
//   서버가 필요한 일은 Vercel의 무료 함수로 처리합니다.
//
// 이 파일의 규칙
//   api 폴더 안의 파일은 Vercel에서 자동으로 서버 주소가 됩니다.
//   이 파일은 /api/gemini 주소가 됩니다.
//   API 키는 코드에 적지 말고 Vercel 환경변수에 넣습니다. (process.env 로 꺼내 씁니다)
// ===================================================

// ===================================================
// Gemini API를 호출하는 Vercel 서버리스 함수
//
// - 무료 Spark 요금제 유지를 위해 Vercel의 무료 함수(/api/gemini)를 사용합니다.
// - API 키는 process.env.GEMINI_API_KEY 환경변수에서 가져옵니다.
// - 무료 tier를 지원하는 gemini-1.5-flash 모델을 기본으로 사용합니다.
// ===================================================

export default async function handler(req, res) {
  // POST 요청만 허용합니다.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  // 본문에서 메모 텍스트를 추출합니다.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const text = body?.text;
  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "메모 내용(text)이 필요합니다." });
  }

  // Vercel 환경변수에서 Gemini API 키를 가져옵니다.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드의 Settings > Environment Variables에서 키를 등록해 주세요."
    });
  }

  // 무료 티어를 지원하는 기본 모델: gemini-1.5-flash (필요 시 환경변수로 변경 가능)
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // AI 보조교사 프롬프트 (개인정보 제외, 학생 메모 내용만 전달)
  const prompt = `당신은 학교 수업 담벼락 활동의 따뜻하고 다정한 AI 보조교사입니다.
다음 학생의 메모를 읽고, 칭찬, 공감, 격려 또는 생각을 키워주는 친절한 짧은 피드백(1~2문장, 100자 이내)을 작성해 주세요.
초등·중학생 눈높이에 맞추어 친근한 말투와 알맞은 이모지를 곁들여 주세요.

[학생 메모]
${text.trim()}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API 오류 응답:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API 호출 중 오류가 발생했습니다."
      });
    }

    const comment = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!comment) {
      return res.status(500).json({ error: "생성된 AI 코멘트가 없습니다." });
    }

    return res.status(200).json({ comment: comment });
  } catch (error) {
    console.error("서버 처리 중 에러 발생:", error);
    return res.status(500).json({ error: "AI 코멘트를 처리하는 중 서버 오류가 발생했습니다." });
  }
}

