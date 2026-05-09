import { NextResponse } from "next/server";

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicError = {
  error?: {
    message?: string;
  };
};

type AnthropicResponse = AnthropicError & {
  content?: AnthropicTextBlock[];
};

const SYSTEM_PROMPT = `You are an AI assistant specialized in analyzing Indonesian insurance policy document images.

First, determine if the image is a valid insurance policy. If it is NOT
(e.g. random photo, receipt, selfie, ID card), return { "is_valid_policy": false }.

If it IS a valid insurance policy, return is_valid_policy: true plus any of these
fields you can extract. Use null for missing fields. Numbers must be plain numbers
(no currency symbol, no thousand separator). Dates in YYYY-MM-DD format.

IDENTITY
- policy_number (string)
- insurance_company (string)
- product_name (string)
- policy_type (one of: JIWA, KESEHATAN, JIWA_KESEHATAN, KECELAKAAN, UNITLINK)
- policy_holder_name (string)
- insured_person_name (string)
- passport_number (string; optional — alphanumeric passport id of policyholder if visible)

PERIOD & DUE
- issue_date (YYYY-MM-DD)
- start_date (YYYY-MM-DD)
- end_date (YYYY-MM-DD)
- due_day (integer 1-28; day of month when premium is due)
- next_due_date (YYYY-MM-DD; upcoming premium due date)
- grace_period_days (integer, default 30)
- policy_term (integer, years)
- premium_payment_term (integer, years)
- policy_status (AKTIF | LAPSE | PAID_UP | SURRENDERED | MATURED)

PREMIUM
- sum_insured (number, IDR)
- premium_amount (number, IDR)
- premium_frequency (MONTHLY | QUARTERLY | SEMESTERLY | YEARLY)

COVERAGE
- coverage_area (INDONESIA | ASIA | ASIA_AUSTRALIA | WORLDWIDE_EXCL_US | WORLDWIDE)
- room_plan (string, e.g. "Standard 1 Bed")
- annual_limit (number)
- lifetime_limit (number)
- deductible (number)
- coinsurance_pct (number 0-100)
- waiting_period_days (integer)
- cashless_network (string)

BENEFITS (all numbers in IDR)
- benefit_life
- benefit_accidental_death
- benefit_disability
- benefit_critical
- benefit_hospitalization (per day)
- benefit_icu (per day)
- benefit_surgery
- benefit_outpatient (per year)
- benefit_daily_cash
- benefit_maternity
- benefit_dental
- benefit_optical
- benefit_ambulance
- benefit_medical_checkup

RIDERS
- riders: array of { name (string), coverage (number) }

BENEFICIARIES
- beneficiaries: array of { name, relationship (PASANGAN|ANAK|ORANG_TUA|SAUDARA|LAINNYA), percentage (number 0-100) }

PAYMENT
- payment_method (TRANSFER | AUTODEBET_REKENING | AUTODEBET_KK | VIRTUAL_ACCOUNT)
- bank_name, account_number, account_holder_name
- card_expiry (MM/YY)
- autodebet_start_date, autodebet_end_date (YYYY-MM-DD)
- autodebet_mandate_ref (string)

Return ONLY raw JSON (no markdown code fences).`;

function extractJson(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? cleaned) as unknown;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan gambar polis JPG atau PNG." },
        { status: 415 },
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!anthropicKey) {
      console.error("Missing ANTHROPIC_API_KEY");
      return NextResponse.json({ error: "Konfigurasi server belum lengkap." }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    const model = process.env.AI_ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract data from this insurance policy image.",
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: file.type,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = (await response.json()) as AnthropicResponse;

    if (!response.ok) {
      console.error("Anthropic policy parse error:", data.error?.message ?? data);
      return NextResponse.json({ error: "Gagal memproses dokumen polis." }, { status: 500 });
    }

    const content = data.content?.find((block) => block.type === "text")?.text;
    if (!content) {
      return NextResponse.json({ error: "AI tidak mengembalikan hasil yang bisa dibaca." }, { status: 502 });
    }

    return NextResponse.json({ data: extractJson(content) });
  } catch (error) {
    console.error("Error parsing policy:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem saat memproses dokumen." }, { status: 500 });
  }
}
