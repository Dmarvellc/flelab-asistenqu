import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah." }, { status: 400 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Use environment variable for API Key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY");
      return NextResponse.json({ error: "Konfigurasi server belum lengkap." }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant specialized in analyzing insurance documents.
            
            First, determine if the image is a valid insurance policy document. 
            If it is NOT an insurance policy (e.g. a random photo, a receipt, a selfie), return JSON with "is_valid_policy": false.
            
            If it IS a valid insurance policy, return JSON with "is_valid_policy": true and extract the following fields:
            - policy_number (string)
            - policy_holder_name (string)
            - insured_person_name (string)
            - start_date (YYYY-MM-DD)
            - end_date (YYYY-MM-DD)
            - insurance_company (string)
            - product_name (string)
            - sum_insured (number)
            - premium_amount (number)
            - beneficiaries (array of strings)
            
            Return ONLY the JSON object, no markdown formatting.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract data from this insurance policy image.",
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return NextResponse.json({ error: "Gagal memproses dokumen polis." }, { status: 500 });
    }

    const content = data.choices[0].message.content;

    // Clean up markdown code blocks if present
    const jsonString = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsedData = JSON.parse(jsonString);

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error("Error parsing policy:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem saat memproses dokumen." }, { status: 500 });
  }
}
