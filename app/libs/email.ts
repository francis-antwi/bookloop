import nodemailer from "nodemailer";

/**
 * Sends a password reset email to the specified user.
 *
 * @param to - Recipient's email address
 * @param resetUrl - Password reset link
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  console.log("📧 Email Configuration:", {
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS ? "***" : undefined,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false, // Gmail with port 587 should use secure: false + TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Bookloop Services" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: "🔐 Reset Your Password - Bookloop",
      html: `
        <div style="font-family:Arial, sans-serif; font-size:15px; color:#333;">
          <h2>Password Reset Requested</h2>
          <p>We received a request to reset your password.</p>
          <p>
            <a href="${resetUrl}" style="background:#0070f3; color:white; padding:10px 15px; border-radius:5px; text-decoration:none;">
              Reset Password
            </a>
          </p>
          <p>If you did not request this, please ignore this email.</p>
          <hr />
          <p style="font-size:12px; color:#888;">— Bookloop Team</p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Could not send email. Please try again later.");
  }
}
