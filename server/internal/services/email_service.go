package services

import (
	"fmt"
	"log"

	mail "github.com/wneessen/go-mail"
)

// EmailService sends transactional emails (verification, OTP, etc.).
type EmailService interface {
	SendVerificationEmail(to, name, token string) error
	SendOTPEmail(to, code string) error
}

// RealEmailService sends emails via SMTP (Stalwart or any SMTP server).
type RealEmailService struct {
	smtpHost    string
	smtpPort    int
	smtpUser    string
	smtpPass    string
	fromAddress string
	clientURL   string
}

// NewRealEmailService creates a new SMTP-backed email service.
func NewRealEmailService(smtpHost string, smtpPort int, smtpUser, smtpPass, fromAddress, clientURL string) *RealEmailService {
	return &RealEmailService{
		smtpHost:    smtpHost,
		smtpPort:    smtpPort,
		smtpUser:    smtpUser,
		smtpPass:    smtpPass,
		fromAddress: fromAddress,
		clientURL:   clientURL,
	}
}

func (s *RealEmailService) SendVerificationEmail(to, name, token string) error {
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", s.clientURL, token)

	htmlBody := fmt.Sprintf(`<div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;background:#f0ede8;color:#1a1a1a">
<h2 style="letter-spacing:2px;font-size:14px">VIECZ — EMAIL VERIFICATION</h2>
<p>Hello %s,</p>
<p>Click the link below to verify your email address:</p>
<p><a href="%s" style="color:#1a1a1a;font-weight:bold">%s</a></p>
<p>This link expires in 1 hour.</p>
<p style="font-size:12px;color:#666">If you did not create an account, ignore this email.</p>
</div>`, name, verifyURL, verifyURL)

	plainBody := fmt.Sprintf("Hello %s,\n\nVerify your email: %s\n\nThis link expires in 1 hour.\n\nIf you did not create an account, ignore this email.", name, verifyURL)

	m := mail.NewMsg()
	if err := m.From(s.fromAddress); err != nil {
		return fmt.Errorf("failed to set from address: %w", err)
	}
	if err := m.To(to); err != nil {
		return fmt.Errorf("failed to set to address: %w", err)
	}
	m.Subject("Verify your Viecz email")
	m.SetBodyString(mail.TypeTextPlain, plainBody)
	m.AddAlternativeString(mail.TypeTextHTML, htmlBody)

	opts := []mail.Option{
		mail.WithPort(s.smtpPort),
	}
	if s.smtpUser != "" {
		opts = append(opts,
			mail.WithSMTPAuth(mail.SMTPAuthPlain),
			mail.WithUsername(s.smtpUser),
			mail.WithPassword(s.smtpPass),
		)
	} else {
		opts = append(opts, mail.WithTLSPortPolicy(mail.NoTLS))
	}

	c, err := mail.NewClient(s.smtpHost, opts...)
	if err != nil {
		return fmt.Errorf("failed to create mail client: %w", err)
	}

	if err := c.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	return nil
}

func (s *RealEmailService) SendOTPEmail(to, code string) error {
	htmlBody := fmt.Sprintf(`<div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;background:#f0ede8;color:#1a1a1a">
<h2 style="letter-spacing:2px;font-size:14px">VIECZ — SIGN IN CODE</h2>
<p>Your verification code is:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px 0">%s</p>
<p>This code expires in 10 minutes.</p>
<p style="font-size:12px;color:#666">If you did not request this code, ignore this email.</p>
</div>`, code)

	plainBody := fmt.Sprintf("Your Viecz verification code is: %s\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, ignore this email.", code)

	m := mail.NewMsg()
	if err := m.From(s.fromAddress); err != nil {
		return fmt.Errorf("failed to set from address: %w", err)
	}
	if err := m.To(to); err != nil {
		return fmt.Errorf("failed to set to address: %w", err)
	}
	m.Subject("Your Viecz sign-in code: " + code)
	m.SetBodyString(mail.TypeTextPlain, plainBody)
	m.AddAlternativeString(mail.TypeTextHTML, htmlBody)

	opts := []mail.Option{
		mail.WithPort(s.smtpPort),
	}
	if s.smtpUser != "" {
		opts = append(opts,
			mail.WithSMTPAuth(mail.SMTPAuthPlain),
			mail.WithUsername(s.smtpUser),
			mail.WithPassword(s.smtpPass),
		)
	} else {
		opts = append(opts, mail.WithTLSPortPolicy(mail.NoTLS))
	}

	c, err := mail.NewClient(s.smtpHost, opts...)
	if err != nil {
		return fmt.Errorf("failed to create mail client: %w", err)
	}

	if err := c.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send OTP email: %w", err)
	}

	return nil
}

// NoOpEmailService logs and returns nil. For test server and unit tests.
type NoOpEmailService struct{}

func (n *NoOpEmailService) SendVerificationEmail(to, name, token string) error {
	log.Printf("[NoOpEmailService] Would send verification email to %s (%s)", to, name)
	return nil
}

func (n *NoOpEmailService) SendOTPEmail(to, code string) error {
	log.Printf("[NoOpEmailService] OTP for %s: %s", to, code)
	return nil
}
