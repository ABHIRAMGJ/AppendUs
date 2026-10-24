import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface VerificationCodeProps {
  code?: string
  minutes?: number
}

function VerificationCodeEmail({ code = '123456', minutes = 10 }: VerificationCodeProps) {
  return (
    <Html>
      <Head />
      <Preview>{code} is your AppendUs code</Preview>
      <Body style={{ backgroundColor: '#f6f7fb', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '12px', margin: '0 auto', maxWidth: '480px', padding: '32px' }}>
          <Heading style={{ color: '#4f46e5', fontSize: '24px', margin: '0 0 16px' }}>AppendUs</Heading>
          <Text style={{ color: '#333333', fontSize: '15px', margin: '0 0 8px' }}>Your verification code is:</Text>
          <Section style={{ backgroundColor: '#eef2ff', borderRadius: '8px', margin: '16px 0', padding: '16px', textAlign: 'center' }}>
            <Text style={{ color: '#111827', fontSize: '32px', fontWeight: 'bold', letterSpacing: '6px', margin: 0 }}>{code}</Text>
          </Section>
          <Text style={{ color: '#6b7280', fontSize: '13px', margin: '16px 0 0' }}>
            It expires in {minutes} minutes. If you didn't ask for this, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: VerificationCodeEmail,
  subject: (data: Record<string, any>) => `${data['code'] ?? '123456'} is your AppendUs code`,
  displayName: 'Verification code',
  previewData: { code: '123456', minutes: 10 },
} satisfies TemplateEntry
