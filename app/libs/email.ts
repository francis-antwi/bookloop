import nodemailer from "nodemailer";

/**
 * Sends a password reset email to the specified user.
 *
 * @param to - Recipient's email address
 * @param resetUrl - Password reset link
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
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
        <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; font-family: 'Segoe UI', Roboto, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="text-align: center;">
            <img src="images/app.png" alt="Bookloop Logo" style="max-width: 120px; margin-bottom: 20px;" />
          </div>

          <h2 style="color: #333; margin-bottom: 10px;">Reset Your Password</h2>
          <p style="font-size: 15px; color: #555;">
            You recently requested to reset your password for your Bookloop account. Click the button below to reset it.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0070f3; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            If you didn’t request a password reset, you can safely ignore this email. This password reset link is valid for one hour.
          </p>

          <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />

          <p style="font-size: 12px; color: #999; text-align: center;">
            &copy; ${new Date().getFullYear()} Bookloop. All rights reserved.<br/>
            Need help? <a href="mailto:support@bookloop.com" style="color: #0070f3;">Contact Support</a>
          </p>
        </div>
      `,
    });

    console.log("✅ Password reset email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Could not send password reset email. Please try again later.");
  }
}
