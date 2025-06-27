// app/api/send-otp/route.ts

import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import axios from "axios";

// Formats phone numbers (defaults to Ghana: +233)
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
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(contactPhone);

    // Validate Ghana number format
    const ghanaRegex = /^\+233\d{9}$/;
    if (!ghanaRegex.test(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid Ghana phone number format" },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Find or create user by phone
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

    // Prepare WhatsApp message via Twilio
    const payload = new URLSearchParams({
      To: `whatsapp:${formattedPhone}`,
      From: process.env.TWILIO_WHATSAPP_FROM!,
      ContentSid: process.env.TWILIO_TEMPLATE_SID!,
      ContentVariables: JSON.stringify({ "1": "User", "2": otp }),
    });

    const auth = {
      username: process.env.TWILIO_ACCOUNT_SID!,
      password: process.env.TWILIO_AUTH_TOKEN!,
    };

    const twilioResponse = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${auth.username}/Messages.json`,
      payload,
      { auth }
    );

    return NextResponse.json({
      success: true,
      messageSid: twilioResponse.data.sid,
    });
  } catch (error: any) {
    console.error("Send OTP error:", error.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
