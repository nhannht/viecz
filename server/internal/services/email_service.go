package services

import (
	"fmt"
	"log"

	mail "github.com/wneessen/go-mail"
)

// EmailService sends transactional emails (verification, etc.).
type EmailService interface {
	SendVerificationEmail(to, name, token string) error
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

// NoOpEmailService logs and returns nil. For test server and unit tests.
type NoOpEmailService struct{}

func (n *NoOpEmailService) SendVerificationEmail(to, name, token string) error {
	log.Printf("[NoOpEmailService] Would send verification email to %s (%s)", to, name)
	return nil
}
