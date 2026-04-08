import { NextRequest } from "next/server";

const PROMPTS: Record<string, string> = {
  "work-ticket": `从这张施工作业票图片中提取以下字段，返回JSON（字段不存在则设null）：
{
  "ticketNo": "作业票编号",
  "projectName": "工程项目名称",
  "projectCode": "项目编号",
  "workTeam": "作业班组",
  "workContent": "工作内容（详细）",
  "workLocation": "作业地点",
  "workerCount": 作业人数数字,
  "foreman": "工作负责人姓名",
  "supervisor": "监护人姓名",
  "risks": "主要风险点描述",
  "riskLevel": "风险等级，只能是：一级/二级/三级/四级",
  "plannedStart": "计划开始日期YYYY-MM-DD或null",
  "plannedEnd": "计划结束日期YYYY-MM-DD或null"
}
只返回JSON，不加其他任何文字。`,

  "visa": `从这张工程签证单图片中提取以下字段，返回JSON（字段不存在则设null）：
{
  "serialNo": "签证序号如TJ-001或null",
  "title": "签证标题",
  "project": "工程项目名称",
  "submitter": "提交人或承包单位",
  "reason": "签证原因或提出原因",
  "amount": 签证金额数字（元，没有则0）,
  "type": "根据内容判断：工程量签证填quantity，工期签证填period，默认quantity"
}
只返回JSON，不加其他任何文字。`,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.VOLC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "未配置 VOLC_API_KEY" }, { status: 500 });
  }

  let imageBase64: string, mediaType: string, docType: string;
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mediaType   = body.mediaType ?? "image/jpeg";
    docType     = body.docType ?? "work-ticket";
  } catch {
    return Response.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!imageBase64) {
    return Response.json({ error: "缺少图片数据" }, { status: 400 });
  }

  const prompt = PROMPTS[docType];
  if (!prompt) {
    return Response.json({ error: "不支持的文档类型" }, { status: 400 });
  }

  try {
    const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "doubao-vision-pro-32k",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${imageBase64}`,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[OCR] Volcengine API error:", err);
      return Response.json({ error: "AI识别失败，请检查图片质量后重试" }, { status: 502 });
    }

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "{}";

    // 提取 JSON（兼容模型输出 markdown 代码块的情况）
    const start = raw.indexOf("{");
    const end   = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return Response.json({ error: "AI未能识别出有效内容，请确认图片是否清晰" }, { status: 422 });
    }

    const fields = JSON.parse(raw.slice(start, end + 1));
    return Response.json({ fields });
  } catch (e) {
    console.error("[OCR] error:", e);
    return Response.json({ error: "识别失败，请重试" }, { status: 500 });
  }
}
