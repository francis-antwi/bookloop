import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import axios from "axios";

// ✅ Format phone numbers to international format (Ghana default)
function formatPhone(raw: string): string {
  const trimmed = raw.replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return "+233" + trimmed.slice(1);
  return "+233" + trimmed;
}

export async function POST(req: Request) {
  try {
    const { contactPhone } = await req.json();

    if (!contactPhone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required." },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(contactPhone);

    // ✅ Validate Ghanaian phone format
    const ghanaRegex = /^\+233\d{9}$/;
    if (!ghanaRegex.test(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid Ghana phone number format." },
        { status: 400 }
      );
    }

    // ✅ Generate OTP & expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // ✅ Find or create user by contactPhone
    let user = await prisma.user.findFirst({
      where: { contactPhone: formattedPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          contactPhone: formattedPhone,
          otpCode: otp,
          otpExpiresAt: expiresAt,
          isOtpVerified: false,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: otp,
          otpExpiresAt: expiresAt,
          isOtpVerified: false,
        },
      });
    }

    // ✅ Check env vars before Twilio call
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_TEMPLATE_SID } = process.env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !TWILIO_TEMPLATE_SID) {
      console.warn("⚠️ Twilio environment variables are missing.");
      return NextResponse.json(
        { success: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

    // ✅ Send OTP via Twilio WhatsApp API
    const payload = new URLSearchParams({
      To: `whatsapp:${formattedPhone}`,
      From: TWILIO_WHATSAPP_FROM,
      ContentSid: TWILIO_TEMPLATE_SID,
      ContentVariables: JSON.stringify({ "1": "User", "2": otp }),
    });

    const auth = {
      username: TWILIO_ACCOUNT_SID,
      password: TWILIO_AUTH_TOKEN,
    };

    const twilioResponse = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${auth.username}/Messages.json`,
      payload,
      { auth }
    );

    console.log("✅ OTP sent to", formattedPhone, "| SID:", twilioResponse.data.sid);

    return NextResponse.json({
      success: true,
      messageSid: twilioResponse.data.sid,
    });
  } catch (error: any) {
    const msg = error.response?.data?.message || error.message || "Unknown error";
    console.error("🔴 Send OTP error:", msg);

    return NextResponse.json(
      { success: false, error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
