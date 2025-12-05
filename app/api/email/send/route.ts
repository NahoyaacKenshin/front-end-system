import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// This endpoint acts as an email service proxy
// It uses Vercel's serverless functions which may allow SMTP connections
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Get SMTP credentials from environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM;
    const appName = process.env.APP_NAME || 'Locafy';

    // Validate SMTP configuration
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFrom) {
      return NextResponse.json(
        { success: false, error: 'SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM environment variables.' },
        { status: 500 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Connection timeout settings
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      requireTLS: !(process.env.SMTP_SECURE === 'true') && Number(smtpPort) === 587,
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${appName}" <${smtpFrom}>`,
      to,
      subject,
      html,
    });

    console.log(`✓ Email sent successfully via Vercel to: ${to} (Message ID: ${info.messageId})`);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    });
  } catch (error: any) {
    console.error('Email sending error in Vercel:', {
      error: error?.message || error,
      code: error?.code,
      command: error?.command,
      response: error?.response,
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: Add a simple health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'Email Service',
    status: 'running',
    smtpConfigured: !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_FROM
    ),
  });
}

