import { NextResponse } from 'next/server';

// This token must match the one you set in the Meta App Dashboard
const VERIFY_TOKEN = process.env.WABA_WEBHOOK_VERIFY_TOKEN || 'asistenqu_webhook_verify_token_123';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if a request is for webhook verification
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    // Responds with '403 Forbidden' if verify tokens do not match
    return new NextResponse('Forbidden', { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check the Incoming webhook message
    console.log(JSON.stringify(body, null, 2));

    // Info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phone_number_id =
          body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; // Extract the phone number from the webhook payload
        const msg_body = body.entry[0].changes[0].value.messages[0].text.body; // Extract the message text from the webhook payload
        
        console.log(`Received message "${msg_body}" from ${from} to phone number ID ${phone_number_id}`);
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      // Return a '404 Not Found' if event is not from a WhatsApp API
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
