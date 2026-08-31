// ============================================
// src/services/email.service.ts
// SERVIÇO DE E-MAIL  25/08/2026
// ============================================

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface AccountDeletionEmailData {
    email: string;
    reason: string;
}

export async function sendAccountDeletionRequest(
    data: AccountDeletionEmailData
): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY não configurada');
    }

    const { email, reason } = data;

    if (!email || !reason) {
        throw new Error('E-mail e motivo são obrigatórios');
    }

    const { error } = await resend.emails.send({
        from: 'Loterias IA <onboarding@resend.dev>',
        to: ['geradorloterico@gmail.com'],
        subject: 'Solicitação de exclusão de conta - Loterias IA',
        html: `
            <h2>Solicitação de exclusão de conta</h2>
    
            <p><strong>E-mail da conta:</strong> ${email}</p>
    
            <p><strong>Motivo informado:</strong></p>
            <p>${reason}</p>
    
            <hr>
    
            <p>
                O usuário solicitou a exclusão da conta do Loterias IA.
            </p>
    
            <p>
                Esta solicitação ainda não executa a exclusão automática.
            </p>
        `,
    });

    if (error) {
        console.error('❌ Erro ao enviar e-mail pelo Resend:', error);
        throw new Error('Não foi possível enviar a solicitação de exclusão');
    }

    console.log('✅ Solicitação de exclusão enviada para o e-mail administrativo');
}
