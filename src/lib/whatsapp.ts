interface SendMessageParams {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendMessageParams) {
  const token = process.env.WABA_SYSTEM_USER_ACCESS_TOKEN;
  const phoneNumberId = process.env.WABA_BUSINESS_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("Missing WhatsApp configuration in environment variables.");
    return { success: false, error: "Missing WhatsApp credentials." };
  }

  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: {
      body: message,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to send WhatsApp message:", data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
