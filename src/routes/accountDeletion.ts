// ============================================
// src/routes/accountDeletion.ts
// SOLICITAÇÃO DE EXCLUSÃO DE CONTA
// ============================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendAccountDeletionRequest } from '../services/email.service';

const router = express.Router();

const deletionRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Muitas solicitações. Tente novamente mais tarde.'
    }
});

router.post(
    '/delete-request',
    deletionRequestLimiter,
    async (req, res) => {
        try {
            const email =
                typeof req.body?.email === 'string'
                    ? req.body.email.trim()
                    : '';

            const reason =
                typeof req.body?.reason === 'string'
                    ? req.body.reason.trim()
                    : '';

            if (!email || !reason) {
                return res.status(400).json({
                    success: false,
                    error: 'E-mail e motivo são obrigatórios'
                });
            }

            if (email.length > 254) {
                return res.status(400).json({
                    success: false,
                    error: 'E-mail inválido'
                });
            }

            if (reason.length > 2000) {
                return res.status(400).json({
                    success: false,
                    error: 'O motivo excede o limite permitido'
                });
            }

            await sendAccountDeletionRequest({
                email,
                reason
            });

            return res.status(200).json({
                success: true,
                message: 'Solicitação de exclusão enviada com sucesso'
            });

        } catch (error: any) {
            console.error(
                '❌ Erro na solicitação de exclusão:',
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error?.message ||
                    'Não foi possível enviar a solicitação de exclusão'
            });
        }
    }
);

export default router;
