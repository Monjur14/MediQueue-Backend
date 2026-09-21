import "dotenv/config";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailUtil = {
  async sendDoctorInvitation(data: {
    to: string;
    full_name: string;
    setupToken: string;
    clinicName: string;
  }) {
    // Frontend URL for setting up password, you might want to make this configurable based on your environment
    const setupLink = `http://localhost:3000/setup-password?token=${data.setupToken}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: data.to,
      subject: `You have been invited to join ${data.clinicName}`,
      html: `
        <h2>Hello ${data.full_name},</h2>

        <p>
          You have been invited to join
          <strong>${data.clinicName}</strong> on MediQueue.
        </p>

        <p>
          Click the link below to set your password and activate your account:
        </p>

        <a href="${setupLink}">Set My Password</a>

        <p>
          This link expires in <strong>24 hours</strong>.
        </p>

        <br/>

        <p>
          If you did not expect this invitation, ignore this email.
        </p>
      `,
    });
  },
};
