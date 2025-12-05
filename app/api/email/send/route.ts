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

    // Create transporter with optimized timeout settings
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Optimized timeout settings for Vercel serverless functions
      connectionTimeout: 15000, // 15 seconds to establish connection
      greetingTimeout: 15000, // 15 seconds for SMTP greeting
      socketTimeout: 45000, // 45 seconds for socket operations (Vercel allows up to 60s on pro)
      // Pool connections for better performance
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      // For Gmail with port 587 (STARTTLS)
      requireTLS: !(process.env.SMTP_SECURE === 'true') && Number(smtpPort) === 587,
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send email with timeout wrapper (Vercel functions have max 60s execution time)
    console.log(`Attempting to send email to ${to} via Vercel...`);
    
    const emailPromise = transporter.sendMail({
      from: `"${appName}" <${smtpFrom}>`,
      to,
      subject,
      html,
    });

    // Add a timeout wrapper (50 seconds max to leave buffer for Vercel)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout after 50 seconds')), 50000);
    });

    const info = await Promise.race([emailPromise, timeoutPromise]);

    console.log(`✓ Email sent successfully via Vercel to: ${to} (Message ID: ${info.messageId})`);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    });
  } catch (error: any) {
    const errorDetails: any = {
      error: error?.message || error,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      errno: error?.errno,
      syscall: error?.syscall,
      address: error?.address,
      port: error?.port,
    };

    console.error('Email sending error in Vercel:', errorDetails);

    // Provide user-friendly error messages
    let userMessage = error?.message || 'Failed to send email';
    if (error?.message?.includes('timeout')) {
      userMessage = 'Email sending timed out. The SMTP server may be slow or unreachable. Please try again.';
    } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED') {
      userMessage = 'Could not connect to email server. Please check SMTP configuration.';
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
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

